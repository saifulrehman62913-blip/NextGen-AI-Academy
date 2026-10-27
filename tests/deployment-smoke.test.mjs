import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDeployment} from '../scripts/check-deployment.mjs';
const metadata={languages:Array.from({length:34},()=>({})),lessons:[]};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
function fixture(url,options){
 assert.equal(options.redirect,'error');assert.ok(options.signal);assert.equal(options.method,undefined);
 const path=new URL(url).pathname;
 if(options.headers?.Origin)return json({},403);
 if(path==='/')return new Response('ILMIGO',{headers:{'Content-Security-Policy':"frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'}});
 if(path==='/api/config')return json({cloud:true,ai:true,purchases:true,childSessions:true,subscription:{enabled:true,amountMinor:1000,currency:'USD',interval:'year',trialDays:3,trialAutoCharges:false}});
 if(path==='/api/catalog'||path==='/shared/catalog.json')return json(metadata);
 if(path==='/api/entitlements'||path==='/api/member-catalog')return json({},401);
 if(path==='/api/auth/otp')return json({},405);
 return json({},404);
}
test('deployment smoke uses only read-only requests and validates paid privacy boundaries',async()=>{
 const result=await checkDeployment('https://academy.example',{fetcher:fixture});assert.equal(result.passed,true);assert.equal(result.checks.length,9);
});
test('deployment smoke fails closed for disabled billing and exposed bundled lessons',async()=>{
 const result=await checkDeployment('https://academy.example',{fetcher:(url,options)=>url.endsWith('/api/config')?json({cloud:false}):url.endsWith('/shared/catalog.json')?json({...metadata,lessons:[{id:'leak'}]}):fixture(url,options)});
 assert.equal(result.passed,false);assert.ok(result.issues.includes('Paid public configuration failed.'));assert.ok(result.issues.includes('Bundled lessons protected failed.'));
});
test('deployment smoke rejects unsafe origins and redacts network failures',async()=>{
 for(const value of ['http://example.org','https://user:secret@example.org','https://example.org/path'])await assert.rejects(checkDeployment(value));
 const result=await checkDeployment('https://academy.example',{fetcher:async()=>{throw Error('private provider info');}});assert.equal(result.issues.length,9);assert.ok(!JSON.stringify(result).includes('private'));
});
