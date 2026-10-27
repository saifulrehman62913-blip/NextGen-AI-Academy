import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from './helpers.mjs';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'private'};
test('read-only API endpoints reject mutation methods before provider access',async t=>{
 const s=await run(t,env,()=>{throw Error('Provider must not run');});
 for(const path of ['/api/config','/api/catalog','/api/entitlements','/api/member-catalog'])for(const method of ['POST','PUT','DELETE'])assert.equal((await s.get(path,{method})).status,405,`${method} ${path}`);
});
test('provider timeout and network failure return retryable gateway errors without internal details',async t=>{
 for(const [error,status] of [[new DOMException('private timeout detail','TimeoutError'),504],[new TypeError('private network detail'),502]]){
  const s=await run(t,env,async()=>{throw error;});
  const result=await s.post('/api/auth/otp',{email:'learner@example.com'});
  assert.equal(result.status,status);assert.doesNotMatch(await result.text(),/private/);
 }
});
test('service worker skips no-store responses and tolerates cache quota failures',async()=>{
 const handlers={};let puts=0,response,pending=[];
 const caches={open:async()=>({put:async()=>{puts++;throw Error('Quota exceeded');}})};
 const self={location:{origin:'https://ilmigo.test'},addEventListener:(name,handler)=>handlers[name]=handler};
 vm.runInNewContext(await readFile(new URL('../web/sw.js',import.meta.url),'utf8'),{self,caches,URL,Response,fetch:async()=>response});
 for(const cacheControl of ['no-store','private, no-store','no-cache']){
  response=new Response('asset',{headers:{'Cache-Control':cacheControl}});
  let delivered;handlers.fetch({request:{url:'https://ilmigo.test/app.js',method:'GET'},respondWith:p=>delivered=p,waitUntil:p=>pending.push(p)});
  assert.equal(await(await delivered).text(),'asset');await Promise.all(pending);pending=[];
 }
 assert.equal(puts,1);
});
test('service worker installation also respects no-store lesson catalog',async()=>{
 const handlers={},stored=[];
 const self={addEventListener:(name,handler)=>handlers[name]=handler};
 const caches={open:async()=>({put:async path=>stored.push(path)})};
 vm.runInNewContext(await readFile(new URL('../web/sw.js',import.meta.url),'utf8'),{self,caches,fetch:async path=>new Response('asset',{headers:{'Cache-Control':path==='/shared/catalog.json'?'no-store':'no-cache'}})});
 let installed;handlers.install({waitUntil:p=>installed=p});await installed;
 assert.ok(stored.includes('/app.js'));assert.ok(!stored.includes('/shared/catalog.json'));
});
