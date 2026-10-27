import test from 'node:test';
import assert from 'node:assert/strict';
import {ApiSession} from '../shared/session.mjs';
import {run} from './helpers.mjs';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function browser(fetcher){let auth={userId:'A',access_token:'old-access',refresh_token:'old-refresh'};const client=new ApiSession({getSession:()=>auth,setSession:(value,expected)=>{if(auth!==expected)return false;Object.assign(auth,value);return true;},fetcher});return {client,get auth(){return auth;},set auth(value){auth=value;}};}
test('failed session storage update removes the previous account rather than restoring it on reload',async()=>{
 const source=await readFile(new URL('../web/app.js',import.meta.url),'utf8');
 const saved=new Map([['ilmigo-auth',JSON.stringify({userId:'A',access_token:'old-A'})]]);
 const context=vm.createContext({auth:{userId:'B',access_token:'new-B'},sessionStorage:{setItem(){throw Error('Quota exceeded');},removeItem:key=>saved.delete(key)}});
 const start=source.indexOf('function persistAuth()'),end=source.indexOf('\nfunction loginModal(',start);
 vm.runInContext(source.slice(start,end),context);vm.runInContext('persistAuth()',context);
 assert.equal(saved.has('ilmigo-auth'),false);assert.equal(context.auth.userId,'B');
});
test('concurrent expired browser requests share one refresh and replay the original body',async()=>{
 let release,started,refreshes=0;const ready=new Promise(r=>started=r),gate=new Promise(r=>release=r),sent=[];
 const app=browser(async(path,options)=>{
  if(path==='/api/auth/refresh'){refreshes++;assert.equal(options.headers.Authorization,undefined);assert.deepEqual(JSON.parse(options.body),{refresh_token:'old-refresh',expectedUserId:'A'});started();await gate;return json({userId:'A',access_token:'new-access',refresh_token:'new-refresh'});}
  sent.push(options);return options.headers.Authorization==='Bearer old-access'?json({error:'expired'},401):json({ok:true});
 });
 const data={name:'original'},a=app.client.request('/api/sync',data),b=app.client.request('/api/entitlements');data.name='edited';
 await ready;release();await Promise.all([a,b]);assert.equal(refreshes,1);assert.equal(sent.length,4);
 assert.deepEqual(sent.filter(x=>x.body).map(x=>JSON.parse(x.body)),[{name:'original'},{name:'original'}]);
 assert.equal(app.auth.refresh_token,'new-refresh');
});
test('late refresh cannot resurrect a logged-out account or overwrite another account',async()=>{
 let release,started;const ready=new Promise(r=>started=r),gate=new Promise(r=>release=r);
 const app=browser(async path=>{if(path==='/api/auth/refresh'){started();await gate;return json({userId:'A',access_token:'new-A',refresh_token:'new-refresh-A'});}return json({error:'expired'},401);});
 const pending=app.client.request('/api/entitlements');await ready;app.auth={userId:'B',access_token:'token-B',refresh_token:'refresh-B'};release();
 await assert.rejects(pending,/Account changed/);assert.equal(app.auth.access_token,'token-B');
});
test('wrong-account refresh is rejected and a failed refresh does not loop or discard credentials',async()=>{
 for(const response of [()=>json({userId:'B',access_token:'B',refresh_token:'B'}),()=>json({error:'Sign in again'},401)]){
  let refreshes=0,requests=0;const app=browser(async path=>{if(path==='/api/auth/refresh'){refreshes++;return response();}requests++;return json({error:'expired'},401);});
  await assert.rejects(app.client.request('/api/sync',{}));assert.equal(refreshes,1);assert.equal(requests,1);assert.equal(app.auth.access_token,'old-access');
 }
});
test('provider/service failures and public auth requests never trigger a refresh or attach old credentials',async()=>{
 let refreshes=0;const app=browser(async(path,options)=>{if(path==='/api/auth/refresh')refreshes++;if(path==='/api/auth/otp')assert.equal(options.headers.Authorization,undefined);return json({error:'Unavailable'},502);});
 await assert.rejects(app.client.request('/api/speaking',{}),/Unavailable/);await assert.rejects(app.client.request('/api/auth/otp',{email:'a@example.test'}));assert.equal(refreshes,0);
});
test('late successful protected response is rejected after account replacement',async()=>{
 let finish;const waiting=new Promise(r=>finish=r),app=browser(()=>waiting),pending=app.client.request('/api/entitlements');app.auth=null;finish(json({plus:true}));await assert.rejects(pending,/Account changed/);
});
test('malformed browser service responses produce a readable error',async()=>{
 for(const response of [()=>new Response('<html>bad gateway</html>',{status:502}),()=>json([])]){const app=browser(async()=>response());await assert.rejects(app.client.request('/api/entitlements'),/Service unavailable/);}
});

const owner='11111111-1111-4111-a111-111111111111',pid='22222222-2222-4222-a222-222222222222';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'private-test',OPENAI_API_KEY:'ai-test'};
test('backend verifies/rotates owner-bound sessions without returning server credentials',async t=>{
 const s=await run(t,env,async(url,options)=>{
  assert.equal(options.headers.apikey,'public-test');
  if(url.endsWith('/auth/v1/verify'))return json({access_token:'access-A',refresh_token:'refresh-A',expires_at:2000000000,user:{id:owner}});
  assert.match(url,/grant_type=refresh_token/);assert.deepEqual(JSON.parse(options.body),{refresh_token:'refresh-A'});
  return json({access_token:'new-access-A',refresh_token:'new-refresh-A',expires_at:2000003600,user:{id:owner}});
 });
 const verified=await(await s.post('/api/auth/verify',{email:'a@example.test',token:'123456'})).json();assert.equal(verified.refresh_token,'refresh-A');
 const response=await s.post('/api/auth/refresh',{refresh_token:'refresh-A',expectedUserId:owner});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const rotated=await response.json();assert.equal(rotated.refresh_token,'new-refresh-A');assert.equal(rotated.userId,owner);assert.ok(!JSON.stringify(rotated).includes('private-test'));
});
test('backend refuses malformed, mismatched, expired and unavailable refresh sessions',async t=>{
 const unconfigured=await run(t);assert.equal((await unconfigured.post('/api/auth/refresh',{})).status,503);
 const invalid=await run(t,env,()=>{throw Error('Must validate first');});assert.equal((await invalid.post('/api/auth/refresh',{refresh_token:'x'})).status,400);
 for(const [provider,status]of [[()=>json({access_token:'B',refresh_token:'B',user:{id:'another-owner'}}),401],[()=>json({error:'private provider details'},400),401],[()=>json({error:'private provider details'},500),502],[()=>json({user:{id:owner}}),502]]){
  const s=await run(t,env,async()=>provider()),response=await s.post('/api/auth/refresh',{refresh_token:'refresh-A',expectedUserId:owner});assert.equal(response.status,status);assert.ok(!(await response.text()).includes('private provider details'));
 }
});
test('an upstream OpenAI 401 is a service error, not a request to rotate the learner session',async t=>{
 const s=await run(t,env,async url=>{
  if(url.endsWith('/auth/v1/user'))return json({id:owner});
  if(url.includes('/profiles?'))return json([{id:pid,kind:'adult',language:'en'}]);
  if(url.includes('/course_drafts?'))return json([]);
  if(url.endsWith('/rpc/reserve_ai_turn'))return json(true);
  if(url.includes('openai.com'))return json({error:'secret provider-key details'},401);
  throw Error('Unexpected request');
 });
 const response=await s.post('/api/speaking',{profileId:pid,lessonId:'en-hello',transcript:'Hello'},{Authorization:'Bearer valid.token'});assert.equal(response.status,502);assert.ok(!(await response.text()).includes('provider-key'));
});
