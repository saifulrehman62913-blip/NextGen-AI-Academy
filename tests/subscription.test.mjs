import test from 'node:test';
import assert from 'node:assert/strict';
import {subscriptionPlan,subscriptionSettings,trialStatus,paidEntitlement} from '../server/subscription.mjs';
import {run} from './helpers.mjs';
const owner='11111111-1111-4111-a111-111111111111',pid='22222222-2222-4222-a222-222222222222';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'secret-test',OPENAI_API_KEY:'ai-test',REVENUECAT_SECRET_KEY:'rc-test',SUBSCRIPTIONS_ENABLED:'true',REVENUECAT_ANNUAL_PRODUCT_IDS:'ilmigo_plus_annual'};
const auth={Authorization:'Bearer valid.test.token'};
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const row=(offsetHours=-1)=>{const start=Date.now()+offsetHours*3600000;return {owner_id:owner,started_at:new Date(start).toISOString(),expires_at:new Date(start+72*3600000).toISOString()};};
function provider({trial=null,kind='adult',paid=false,expires=true,foreign=false}={}){
 const calls={trial:[],ai:0,quota:[],profiles:0};const existing=trial;
 return {calls,fetch:async(url,options)=>{
  if(url.endsWith('/auth/v1/user'))return json({id:owner});
  if(url.includes('revenuecat.com'))return json({subscriber:{entitlements:paid?{plus:{product_identifier:'ilmigo_plus_annual',period_type:'NORMAL',expires_date:new Date(Date.now()+(expires?1:-1)*86400000).toISOString()}}:{}}});
  if(url.includes('/account_trials?')){assert.ok(url.includes(`owner_id=eq.${owner}`));return json(existing?[existing]:[]);}
  if(url.includes('/profiles?')){calls.profiles++;return json(foreign?[]:[{id:pid,kind,language:'en'}]);}
  if(url.endsWith('/rpc/start_account_trial')){calls.trial.push(JSON.parse(options.body));return json(existing||row(0));}
  if(url.includes('/course_drafts?'))return json([]);
  if(url.endsWith('/rpc/reserve_ai_turn')){calls.quota.push(JSON.parse(options.body));return json(true);}
  if(url.includes('openai.com')){calls.ai++;return json({choices:[{message:{content:'Good practice.'}}]});}
  throw new Error('Unexpected provider call');
 }};
}
test('annual plan is USD 10 and explicit three-day trial does not auto-charge',()=>{
 assert.equal(subscriptionPlan.amountMinor,1000);assert.equal(subscriptionPlan.interval,'year');assert.equal(subscriptionPlan.trialDays,3);assert.equal(subscriptionPlan.trialAutoCharges,false);
 assert.equal(subscriptionSettings({}).enabled,false);
 assert.throws(()=>subscriptionSettings({SUBSCRIPTIONS_ENABLED:'yes'}));assert.throws(()=>subscriptionSettings({SUBSCRIPTIONS_ENABLED:'true'}));
});
test('trial expiry is exclusive, fixed to 72 hours and cannot become available again',()=>{
 const start=Date.UTC(2026,9,27),r={started_at:new Date(start).toISOString(),expires_at:new Date(start+72*3600000).toISOString()};
 assert.equal(trialStatus(null,start).available,true);
 assert.equal(trialStatus(r,start).active,true);assert.equal(trialStatus(r,start+72*3600000).active,false);assert.equal(trialStatus(r,start-1).active,false);
 assert.equal(trialStatus(r,start+90*3600000).available,false);assert.throws(()=>trialStatus({...r,expires_at:'invalid'}));
 assert.throws(()=>trialStatus({...r,expires_at:new Date(start+73*3600000).toISOString()}));
});
test('annual paid entitlement refuses expiry, wrong product, non-expiring grants and extra store trials',()=>{
 const now=Date.now(),e={product_identifier:'annual',expires_date:new Date(now+1000).toISOString(),period_type:'NORMAL'};
 assert.equal(paidEntitlement(e,['annual'],now),true);
 for(const item of [{...e,expires_date:null},{...e,expires_date:new Date(now).toISOString()},{...e,product_identifier:'monthly'},{...e,period_type:'TRIAL'}])assert.equal(paidEntitlement(item,['annual'],now),false);
});
test('trial requires adult ownership, confirmation and authenticated owner from server',async t=>{
 const p=provider(),s=await run(t,env,p.fetch);
 assert.equal((await s.post('/api/trial',{profileId:pid,confirm:true})).status,401);
 assert.equal((await s.post('/api/trial',{profileId:pid},auth)).status,400);
 const response=await s.post('/api/trial',{profileId:pid,confirm:true,owner_id:'attacker',expires_at:'2099-01-01',plus:true},auth);
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.trial.active,true);assert.equal(result.plus,false);assert.deepEqual(p.calls.trial,[{p_owner:owner}]);
 for(const options of [{kind:'child'},{foreign:true}]){const mock=provider(options),other=await run(t,env,mock.fetch);assert.equal((await other.post('/api/trial',{profileId:pid,confirm:true},auth)).status,options.foreign?404:403);assert.equal(mock.calls.trial.length,0);}
});
test('repeated trial start returns original expiry including expired trials, not a fresh trial',async t=>{
 for(const trial of [row(-1),row(-100)]){const p=provider({trial}),s=await run(t,env,p.fetch);const first=await(await s.post('/api/trial',{profileId:pid,confirm:true},auth)).json();const second=await(await s.post('/api/trial',{profileId:pid,confirm:true},auth)).json();assert.equal(first.trial.expiresAt,trial.expires_at);assert.deepEqual(first.trial,second.trial);assert.equal(first.trial.available,false);assert.equal(first.trial.active,Date.parse(trial.expires_at)>Date.now());}
});
test('enabled subscription hides public course bodies and member endpoint fails closed',async t=>{
 const p=provider(),s=await run(t,env,p.fetch);
 for(const url of ['/api/catalog','/shared/catalog.json','/shared/%63atalog.json','/shared/./catalog.json']){const response=await s.get(url);assert.equal(response.status,200);assert.equal((await response.json()).lessons.length,0);}
 assert.equal((await s.get('/api/member-catalog')).status,401);
 assert.equal((await s.get('/api/member-catalog',{headers:auth})).status,402);
 for(const opts of [{trial:row(-1)},{paid:true}]){const mock=provider(opts),other=await run(t,env,mock.fetch);const response=await other.get('/api/member-catalog',{headers:auth});assert.equal(response.status,200);assert.equal((await response.json()).lessons.length,176);}
});
test('expired trial blocks AI before quota/provider while active trial and paid plan use separate limits',async t=>{
 for(const opts of [{},{trial:row(-100)},{trial:row(-1)},{paid:true},{paid:true,expires:false}]){
  const p=provider(opts),s=await run(t,env,p.fetch),response=await s.post('/api/speaking',{profileId:pid,lessonId:'en-hello',transcript:'Hello',plus:true},auth);
  const allowed=opts.trial&&Date.parse(opts.trial.expires_at)>Date.now()||opts.paid&&opts.expires!==false;
  assert.equal(response.status,allowed?200:402);assert.equal(p.calls.ai,allowed?1:0);assert.equal(p.calls.quota.length,allowed?1:0);
  if(allowed)assert.equal(p.calls.quota[0].p_limit,opts.paid?20:3);
 }
});
test('trial status failure cannot grant access; inactive beta never starts a trial',async t=>{
 const p=provider({trial:{started_at:'bad',expires_at:'bad'}}),s=await run(t,env,p.fetch);assert.equal((await s.get('/api/entitlements',{headers:auth})).status,502);
 const disabled=await run(t,{...env,SUBSCRIPTIONS_ENABLED:'false'},p.fetch);assert.equal((await disabled.post('/api/trial',{confirm:true,profileId:pid},auth)).status,503);assert.equal(p.calls.trial.length,0);
});
