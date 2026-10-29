import test from 'node:test';
import assert from 'node:assert/strict';
import {newChildToken,childTokenHash,childConsentVersion} from '../server/child-session.mjs';
import {run} from './helpers.mjs';
const owner='11111111-1111-4111-a111-111111111111',kid='22222222-2222-4222-a222-222222222222',adult='33333333-3333-4333-a333-333333333333';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'private-test'};
const parent={Authorization:'Bearer parent.jwt'},json=(value,status=200)=>new Response(JSON.stringify(value),{status});
async function fixture(t){
 const token=newChildToken(),sessions=new Map([[token.hash,{owner_id:owner,profile_id:kid,consent_version:childConsentVersion,expires_at:new Date(Date.now()+86400000).toISOString()}]]);
 const child={id:kid,owner_id:owner,kind:'child',language:'en',name:'Child',local_key:'child-local',goal:'School & study'};
 const calls={mutations:[],profiles:[],parentAuth:0};
 const s=await run(t,env,async(url,options)=>{
  if(url.endsWith('/auth/v1/user')){calls.parentAuth++;return json({id:owner});}
  if(url.includes('/child_sessions?'))return json(sessions.has(new URL(url).searchParams.get('token_hash').slice(3))?[sessions.get(new URL(url).searchParams.get('token_hash').slice(3))]:[]);
  if(url.includes('/profiles?')){
   calls.profiles.push(url);if(options.method==='PATCH'||options.method==='POST')calls.mutations.push({url,body:JSON.parse(options.body)});
   const q=new URL(url).searchParams;
   if(q.get('id')===`eq.${kid}`)return json([child]);if(q.get('id')===`eq.${adult}`)return json([{...child,id:adult,kind:'adult'}]);
   if(q.has('local_key'))return json([]);
   return json([{...child,id:adult,kind:'adult'},child]);
  }
  if(url.endsWith('/rpc/grant_child_session')){const data=JSON.parse(options.body);calls.mutations.push({url,body:data});const row={owner_id:data.p_owner,profile_id:data.p_profile,token_hash:data.p_hash,consent_version:childConsentVersion,expires_at:new Date(Date.now()+86400000).toISOString()};sessions.set(data.p_hash,row);return json(row);}
  if(url.endsWith('/rpc/revoke_child_sessions')){calls.mutations.push({url,body:JSON.parse(options.body)});sessions.clear();return json(null);}
  if(url.includes('/course_drafts?')||url.includes('/attempts?')||url.includes('/practice_days?'))return json([]);
  if(url.endsWith('/rpc/sync_completion')){calls.mutations.push({url,body:JSON.parse(options.body)});return json(null);}
  throw Error(`Unexpected fixture request: ${url}`);
 });return {s,token,sessions,calls,auth:{Authorization:`Bearer ${token.token}`}};
}
test('child token has independent entropy; only a hash is stored or queried',()=>{
 const a=newChildToken(),b=newChildToken();assert.notEqual(a.token,b.token);assert.equal(a.hash.length,64);assert.equal(childTokenHash(a.token),a.hash);assert.notEqual(a.token,a.hash);assert.equal(childTokenHash('parent.jwt'),null);assert.equal(childTokenHash(a.token+'x'),null);
});
test('parent issuance requires owned child and versioned consent; child receives no parent refresh token',async t=>{
 const f=await fixture(t);
 assert.equal((await f.s.post('/api/child-session',{profileId:kid},parent)).status,400);
 assert.equal((await f.s.post('/api/child-session',{profileId:adult,consent:true,consentVersion:childConsentVersion},parent)).status,400);
 const response=await f.s.post('/api/child-session',{profileId:kid,consent:true,consentVersion:childConsentVersion,ownerId:'forged'},parent);
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.scope,'child');assert.equal(result.userId,owner);assert.equal(result.childProfileId,kid);assert.equal(result.refresh_token,undefined);
 const grant=f.calls.mutations.find(c=>c.url.endsWith('/rpc/grant_child_session'));assert.deepEqual(grant.body,{p_owner:owner,p_profile:kid,p_hash:childTokenHash(result.access_token)});assert.ok(!JSON.stringify(grant).includes(result.access_token));
});
test('child token denies every parent/admin/AI/payment mutation, including credential reissuance',async t=>{
 const f=await fixture(t);
 for(const path of ['/api/trial','/api/speaking','/api/conversation','/api/delete-data','/api/delete-account','/api/child-session','/api/child-session/revoke','/api/admin/courses'])assert.equal((await f.s.post(path,{profileId:adult,confirm:'DELETE',consent:true,consentVersion:childConsentVersion},f.auth)).status,403,path);
 assert.equal((await f.s.get('/api/admin/courses',{headers:f.auth})).status,403);assert.equal(f.calls.mutations.length,0);assert.equal(f.calls.parentAuth,0);
});
test('child sync sees only its bound profile and cannot create, promote or alter family metadata',async t=>{
 const f=await fixture(t),base={id:kid,localId:'forged-local-alias',name:'Forged parent name',kind:'child',language:'en',completed:{},days:[]};
 for(const profiles of [[{...base,id:adult}],[{...base,id:null}],[{...base,kind:'adult'}],[base,{...base,localId:'another'}]])assert.equal((await f.s.post('/api/sync',{profiles},f.auth)).status,403);
 const response=await f.s.post('/api/sync',{profiles:[base]},f.auth);assert.equal(response.status,200);const result=await response.json();assert.equal(result.profiles.length,1);assert.equal(result.profiles[0].id,kid);assert.equal(result.profiles[0].name,'Child');assert.equal(result.profiles[0].localId,'child-local');
 assert.equal(f.calls.mutations.length,0);assert.ok(f.calls.profiles.every(url=>url.includes(`id=eq.${kid}`)));assert.equal(f.calls.parentAuth,0);
});
test('child lesson collection is language-scoped; expiry, tampering and parent revocation fail closed',async t=>{
 const f=await fixture(t),response=await f.s.get('/api/member-catalog',{headers:f.auth});assert.equal(response.status,200);const catalog=await response.json();assert.equal(catalog.lessons.length,24);assert.ok(catalog.lessons.every(l=>l.language==='en'));
 const bad=newChildToken();assert.equal((await f.s.get('/api/entitlements',{headers:{Authorization:`Bearer ${bad.token}`}})).status,401);
 f.sessions.get(f.token.hash).expires_at=new Date(Date.now()-1000).toISOString();assert.equal((await f.s.get('/api/entitlements',{headers:f.auth})).status,401);
 f.sessions.get(f.token.hash).expires_at=new Date(Date.now()+10000).toISOString();assert.equal((await f.s.post('/api/child-session/revoke',{confirm:true},parent)).status,200);assert.equal((await f.s.get('/api/entitlements',{headers:f.auth})).status,401);
});
test('parent sync cannot create a new cloud child without explicit versioned consent',async t=>{
 const f=await fixture(t),response=await f.s.post('/api/sync',{profiles:[{localId:'new-child',name:'New child',kind:'child',language:'en',completed:{}}]},parent);
 assert.equal(response.status,400);assert.equal(f.calls.mutations.length,0);
});
test('anonymous or explicitly unverified provider users cannot issue family sessions',async t=>{
 for(const user of [{id:owner,is_anonymous:true},{id:owner,email_confirmed_at:null}]){
  const s=await run(t,env,async url=>{assert.ok(url.endsWith('/auth/v1/user'));return json(user);});
  assert.equal((await s.post('/api/child-session',{profileId:kid,consent:true,consentVersion:childConsentVersion},parent)).status,403);
 }
});
