import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {run} from './helpers.mjs';
import {createApp} from '../server/server.mjs';
import {configuredOrigin} from '../server/runtime-config.mjs';
const owner='11111111-1111-4111-a111-111111111111';
const env={APP_ORIGIN:'https://academy.example/',SUPABASE_URL:'https://project.supabase.co/',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'private-test'};
const auth={Authorization:'Bearer test.token'};
const catalog=JSON.parse(await readFile(new URL('../shared/catalog.json',import.meta.url),'utf8'));

test('canonical configured origins accept copied trailing slash URLs without breaking browser API or Supabase paths',async t=>{
 const urls=[];
 const app=await run(t,env,async(url,options)=>{urls.push(url);if(url.endsWith('/auth/v1/otp'))return Response.json({});if(url.endsWith('/auth/v1/user'))return Response.json({id:owner});if(url.includes('/rest/v1/profiles?'))return Response.json([]);throw Error('Unexpected provider call');});
 const config=await app.get('/api/config',{headers:{Origin:'https://academy.example'}});assert.equal(config.status,200);
 assert.equal((await app.get('/api/config',{headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await app.post('/api/auth/otp',{email:'learner@example.com'},{Origin:'https://academy.example'})).status,200);
 assert.equal((await app.post('/api/delete-data',{},auth)).status,200);
 assert.equal(urls[0],'https://project.supabase.co/auth/v1/otp');
 assert.ok(urls.every(url=>!url.includes('co//')));
});

test('unsafe provider/application URL configuration fails before serving and does not echo input secrets',()=>{
 assert.equal(configuredOrigin('https://ACADEMY.example:443/','APP_ORIGIN'),'https://academy.example');
 for(const value of ['https://user:private-password@example.com','https://example.com/path','https://example.com?token=private-secret','https://example.com#private-secret','file:///private-secret','malformed-private-secret']){
  for(const field of ['SUPABASE_URL','APP_ORIGIN']){
   assert.throws(()=>createApp({...env,[field]:value}),error=>error.message.includes(field)&&!error.message.includes('private'));
  }
 }
});

test('course publishing requires an explicit boolean review attestation, not a truthy JSON value',async t=>{
 let writes=0;
 const app=await run(t,env,async(url,options)=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:owner,app_metadata:{role:'admin'}});
  writes++;return Response.json([]);
 });
 for(const reviewed of ['false','true',1,{},[]]){
  const response=await app.post('/api/admin/courses',{language:'en',status:'published',reviewed,reviewNote:'Test review',lessons:[catalog.lessons[0]]},auth);
  assert.equal(response.status,400);
 }
 assert.equal(writes,0);
});

test('invalid/expired OTP is a readable client error while provider outages remain gateway failures',async t=>{
 for(const upstream of [400,401,403,422,500]){
  const app=await run(t,env,async()=>Response.json({error:'private auth provider detail'},{status:upstream}));
  const response=await app.post('/api/auth/verify',{email:'learner@example.com',token:'123456'});
  assert.equal(response.status,upstream===500?502:400);
  const body=await response.text();assert.ok(!body.includes('private'));
  if(upstream!==500)assert.match(body,/email code is invalid or expired/);
 }
});

test('auth inputs are validated without truncating a different email address or OTP into validity',async t=>{
 let calls=0;
 const app=await run(t,env,async()=>{calls++;throw Error('Must reject locally');});
 const email='x'.repeat(250)+'@example.com';
 assert.equal((await app.post('/api/auth/otp',{email})).status,400);
 for(const data of [{email,token:'123456'},{email:'learner@example.com',token:'123456789012'},{email:'not-an-email',token:'123456'}])assert.equal((await app.post('/api/auth/verify',data)).status,400);
 assert.equal(calls,0);
});

test('external runtime origins require HTTPS while explicit development loopback hosts permit HTTP',()=>{
 for(const value of ['http://academy.example','http://project.supabase.co','http://192.168.1.5:54321','http://localhost.example']){
  for(const field of ['SUPABASE_URL','APP_ORIGIN'])assert.throws(()=>createApp({...env,[field]:value}),new RegExp(field));
 }
 for(const host of ['localhost','127.0.0.1','[::1]','10.0.2.2'])assert.equal(configuredOrigin(`http://${host}:3000/`,'APP_ORIGIN'),`http://${host}:3000`);
 assert.doesNotThrow(()=>createApp({}));
});

test('provider timeout while downloading the response body remains a gateway timeout',async t=>{
 const app=await run(t,env,async()=>({ok:true,status:200,headers:new Headers(),text:async()=>{throw new DOMException('private body timeout details','TimeoutError');}}));
 const response=await app.post('/api/auth/otp',{email:'learner@example.com'});
 assert.equal(response.status,504);assert.doesNotMatch(await response.text(),/private/);
});
