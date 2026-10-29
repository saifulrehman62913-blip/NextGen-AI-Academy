// Against the disposable local Docker container started by CI, never a live URL.
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:3000';
let ready=false;
for(let i=0;i<40;i++){
 try{if((await fetch(`${origin}/api/config`,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
 await new Promise(resolve=>setTimeout(resolve,500));
}
assert.ok(ready,'Container did not become ready');
const config=await(await fetch(`${origin}/api/config`)).json();assert.equal(config.cloud,false);assert.equal(config.purchases,false);
const catalog=await(await fetch(`${origin}/api/catalog`)).json();assert.equal(catalog.lessons.length,176);assert.equal(catalog.languages.length,34);
assert.equal((await fetch(origin)).status,200);assert.equal((await fetch(`${origin}/.env`)).status,404);
assert.equal((await fetch(`${origin}/shared/session.mjs`)).status,200);
console.log('Built Docker image served the app, session module and 176 lessons; unconfigured purchases stayed disabled.');
