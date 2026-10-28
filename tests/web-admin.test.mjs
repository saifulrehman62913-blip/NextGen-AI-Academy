import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {ApiSession} from '../shared/session.mjs';
const admin=(await readFile(new URL('../web/admin.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replace('export function ','function ');
const worker=await readFile(new URL('../web/sw.js',import.meta.url),'utf8');
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
function studio(fetcher,initial={userId:'owner-A',access_token:'old-A',refresh_token:'refresh-A'}){
 const data=new Map(initial?[['ilmigo-auth',JSON.stringify(initial)]]:[]),nodes=new Map();
 const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 const document={querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{disabled:false,textContent:'',value:'',checked:false});return nodes.get(selector);}};
 const Session=class extends ApiSession {constructor(options){super({...options,fetcher:options.fetcher||fetcher});}};
 const context=vm.createContext({ApiSession:Session,sessionStorage:storage,document,console});vm.runInContext(admin,context);
 return {request:context.createCourseStudioClient(storage,fetcher),nodes,storage,data};
}
test('course studio rotates an expired parent session and persists the new account-bound tokens',async()=>{
 const paths=[];const s=studio(async(path,options)=>{
  paths.push(path);if(path==='/api/auth/refresh'){assert.equal(options.headers.Authorization,undefined);return json({userId:'owner-A',access_token:'new-A',refresh_token:'new-refresh-A'});}
  if(options.headers.Authorization==='Bearer old-A')return json({error:'Expired'},401);
  assert.equal(options.headers.Authorization,'Bearer new-A');return json({courses:[]});
 });
 assert.deepEqual(await s.request('GET'),{courses:[]});
 assert.deepEqual(paths,['/api/admin/courses','/api/auth/refresh','/api/admin/courses']);
 assert.equal(JSON.parse(s.storage.getItem('ilmigo-auth')).refresh_token,'new-refresh-A');
});
test('course studio refuses child/missing/malformed credentials before sending an admin request',async()=>{
 for(const value of [null,{userId:'A'},{userId:'A',access_token:'child',scope:'child'}]){
  let calls=0;const s=studio(async()=>{calls++;return json({});},value);
  await assert.rejects(s.request('GET'),/Sign in|parent/);assert.equal(calls,0);
 }
});
test('late course response cannot be shown after the tab changes to another account',async()=>{
 let finish;const waiting=new Promise(r=>finish=r),s=studio(()=>waiting),pending=s.request('GET');
 s.storage.setItem('ilmigo-auth',JSON.stringify({userId:'B',access_token:'B'}));finish(json({courses:[{language:'en'}]}));
 await assert.rejects(pending,/Account changed/);assert.equal(JSON.parse(s.storage.getItem('ilmigo-auth')).userId,'B');
});
test('course studio handles malformed service responses and blocks concurrent load/save operations',async()=>{
 const malformed=studio(async()=>new Response('<html>upstream error</html>',{status:502}));await assert.rejects(malformed.request('GET'),/Service unavailable/);
 let finish,calls=0;const waiting=new Promise(r=>finish=r),s=studio(async()=>{calls++;return waiting;});
 const loading=s.nodes.get('#load').onclick();assert.equal(s.nodes.get('#save').disabled,true);assert.equal(s.nodes.get('#load').disabled,true);
 await s.nodes.get('#course').onsubmit({preventDefault(){}});assert.equal(calls,1);
 finish(json({courses:[]}));await loading;assert.equal(s.nodes.get('#save').disabled,false);assert.equal(s.nodes.get('#load').disabled,false);
 for(const id of ['#language','#status','#lessons','#note','#reviewed'])s.nodes.set(id,{value:'',checked:false});
 s.nodes.get('#lessons').value='invalid JSON';await s.nodes.get('#course').onsubmit({preventDefault(){}});
 assert.equal(calls,1);assert.equal(s.nodes.get('#save').disabled,false);assert.ok(s.nodes.get('#result').textContent);
});
test('failed refreshed-session persistence removes stale credentials and does not replay publication',async()=>{
 const paths=[];const s=studio(async(path)=>{paths.push(path);return path==='/api/auth/refresh'?json({userId:'owner-A',access_token:'new-A',refresh_token:'new-refresh-A'}):json({error:'Expired'},401);});
 s.storage.setItem=()=>{throw Error('Quota');};await assert.rejects(s.request('POST',{status:'published'}),/Account changed/);
 assert.deepEqual(paths,['/api/admin/courses','/api/auth/refresh']);assert.equal(s.storage.getItem('ilmigo-auth'),null);
});
test('service worker activation preserves caches belonging to other same-origin applications',async()=>{
 const handlers={},deleted=[];const self={addEventListener:(name,handler)=>handlers[name]=handler};
 const caches={keys:async()=>['other-app-v1','ilmigo-v4.1','ilmigo-v5.1','ilmigo-v6.0','ilmigo-v6.1'],delete:async key=>deleted.push(key)};
 vm.runInNewContext(worker,{self,caches});let finished;handlers.activate({waitUntil:p=>finished=p});await finished;
 assert.deepEqual(deleted,['ilmigo-v4.1','ilmigo-v5.1','ilmigo-v6.0']);
});
test('service worker falls back to cache when network headers or response bodies stall',async()=>{
 for(const bodyStalls of [false,true]){
  const handlers={},timers=new Map();let nextTimer=0,signal,delivered;
  const self={location:{origin:'https://ilmigo.test'},addEventListener:(name,handler)=>handlers[name]=handler};
  const caches={match:async()=>new Response('cached offline app')};
  const fetch=async(request,options)=>{signal=options.signal;if(!bodyStalls)return new Promise(()=>{});return {ok:true,status:200,statusText:'OK',headers:new Headers(),arrayBuffer:()=>new Promise(()=>{})};};
  vm.runInNewContext(worker,{self,caches,fetch,AbortController,URL,Headers,Response,setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timers.delete(id)});
  handlers.fetch({request:{method:'GET',url:'https://ilmigo.test/app.js'},respondWith:p=>delivered=p});
  await Promise.resolve();assert.equal(timers.size,1);[...timers.values()][0]();
  assert.equal(await(await delivered).text(),'cached offline app');assert.equal(signal.aborted,true);assert.equal(timers.size,0);
 }
});
