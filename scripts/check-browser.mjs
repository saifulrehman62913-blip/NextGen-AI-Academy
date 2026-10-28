// Runs only in CI with the exact Playwright package installed by the workflow.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const out=new URL('../review/browser/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const failures=[],scenarios=[];let currentPage;
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('ilmigo-v2:guest')));
const active=async page=>{const saved=await state(page);return saved.profiles.find(p=>p.id===saved.active);};
const exact=text=>new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`);
async function onboard(page,ui='en',course='en'){
 page.on('pageerror',error=>failures.push(error.message));
 // Test the local app independently of third-party font delivery.
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());
 await page.route('https://fonts.gstatic.com/**',route=>route.abort());
 await page.goto('http://127.0.0.1:3000',{waitUntil:'domcontentloaded'});
 await page.locator('#first-name').fill(ui==='ur'?'Urdu QA':'Adult QA');
 await page.locator('#first-ui').selectOption(ui);await page.locator('#first-course').selectOption(course);
 await page.locator('#adult-check').check();await page.locator('#onboard button[type="submit"]').click();
 await page.locator('#onboard').waitFor({state:'hidden'});
}
async function answer(page,lesson,wrong=false){
 const questions=lesson.checks||[lesson.quiz];
 for(let i=0;i<questions.length;i++){
  const q=questions[i],value=wrong&&i===0?q.options.find(v=>v!==q.answer):q.answer;
  await page.locator(`[data-answer-index="${i}"]`).filter({hasText:exact(value)}).click();
 }
 await page.locator('#next-block').click();
}
try{
 const desktop=await browser.newContext({viewport:{width:1280,height:900}});
 const page=currentPage=await desktop.newPage();page.setDefaultTimeout(15000);await onboard(page);
 const catalog=await(await page.request.get('http://127.0.0.1:3000/api/catalog')).json(),lesson=catalog.lessons.find(l=>l.id==='en-hello');
 assert.ok(lesson);assert.equal((await active(page)).kind,'adult');
 await page.locator('[data-lesson="en-hello"]').first().click();
 for(let i=0;i<3;i++)await page.locator('#next-block').click();
 await page.locator('#writing-response').fill('QA writing draft: Hello, how are you?');
 await page.locator('#next-block').click();await page.locator('#next-block').click();
 assert.equal(Object.keys((await active(page)).completed).length,0,'Unanswered quiz must not complete');
 await answer(page,lesson,true);assert.equal(Object.keys((await active(page)).completed).length,0,'Wrong answer must not complete');
 await answer(page,lesson);await page.locator('.large-stat').waitFor();
 assert.equal(Object.keys((await active(page)).completed).length,1);
 await page.locator('#overlay [data-action="close"]').click();
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('nav [data-nav="path"]').waitFor();
 assert.equal(Object.keys((await active(page)).completed).length,1,'Progress must survive reload');
 await page.locator('nav [data-nav="path"]').click();await page.locator('[data-lesson="en-hello"]').first().click();
 for(let i=0;i<3;i++)await page.locator('#next-block').click();
 assert.equal(await page.locator('#writing-response').inputValue(),'QA writing draft: Hello, how are you?');
 await page.locator('#next-block').click();await answer(page,lesson);await page.locator('.large-stat').waitFor();
 await page.locator('#overlay [data-action="close"]').click();
 assert.equal(Object.keys((await active(page)).completed).length,1,'Repeating must not duplicate completion/XP');
 await page.locator('nav [data-nav="home"]').click();
 assert.equal((await page.locator('.stat').filter({hasText:'XP'}).locator('strong').textContent()).trim(),'30 XP');
 await page.screenshot({path:new URL('english-desktop.png',out).pathname,fullPage:true});
 scenarios.push('English lesson: missing/wrong/correct answers, writing draft, reload and repeat XP');

 const adult=await active(page),answers=['284619','284619'];
 page.on('dialog',async dialog=>{if(!answers.length){failures.push('Unexpected parent dialog');await dialog.dismiss();}else await dialog.accept(answers.shift());});
 await page.locator('nav [data-nav="family"]').click();await page.locator('[data-action="add-profile"]').click();
 await page.locator('#child-name').fill('Child QA');await page.locator('#parent-consent').check();await page.locator('#child-form button').click();
 await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('ilmigo-v2:guest'));return s.profiles.find(p=>p.id===s.active).kind==='child';});
 assert.equal(Object.keys((await active(page)).completed).length,0,'Child must not inherit adult progress');
 answers.push('000000');await page.locator(`[data-profile="${adult.id}"]`).click();await page.getByText('Incorrect parent PIN.',{exact:true}).waitFor();assert.equal((await active(page)).kind,'child');
 await page.locator('nav [data-nav="practice"]').click();await page.locator('#record').click();
 assert.equal(await page.locator('#conversation-send').isDisabled(),true,'Child live conversation must remain disabled');
 await page.locator('nav [data-nav="family"]').click();answers.push('284619');await page.locator(`[data-profile="${adult.id}"]`).click();
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem('ilmigo-v2:guest')).active===id,adult.id);
 assert.equal(Object.keys((await active(page)).completed).length,1);assert.equal(answers.length,0);
 scenarios.push('Family: browser PIN hashing, wrong-PIN refusal, child restrictions and separate progress');
 await desktop.close();

 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const urdu=currentPage=await mobile.newPage();urdu.setDefaultTimeout(15000);await onboard(urdu,'ur','ur');
 assert.equal(await urdu.locator('html').getAttribute('dir'),'rtl');assert.equal(await urdu.locator('html').getAttribute('lang'),'ur');
 assert.equal((await active(urdu)).language,'ur');
 const size=await urdu.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(size.content<=size.viewport+2,`Urdu mobile page overflows: ${size.content}/${size.viewport}`);
 await urdu.screenshot({path:new URL('urdu-mobile.png',out).pathname,fullPage:true});
 await urdu.reload({waitUntil:'domcontentloaded'});await urdu.locator('html[dir="rtl"]').waitFor();assert.equal((await active(urdu)).name,'Urdu QA');
 scenarios.push('Urdu mobile: RTL, language selection, viewport width and saved onboarding');
 await mobile.close();
 // Cloud boundaries are tested against the actual backend in Node/PostgreSQL.
 // This fixture exercises only the browser's credential transition and recovery UX.
 const owner='11111111-1111-4111-a111-111111111111',parentToken='parent-sensitive-access',parentRefresh='parent-sensitive-refresh',childToken='ilmigo_child_'+'x'.repeat(43);
 const cloudContext=await browser.newContext({viewport:{width:1280,height:900}}),cloudPage=currentPage=await cloudContext.newPage();cloudPage.setDefaultTimeout(15000);
 const cloudRows=new Map();let issuedChildId=null,revoked=false;
 const fulfill=(route,value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
 await cloudPage.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,data=request.postData()?request.postDataJSON():{};
  if(path==='/api/config')return fulfill(route,{cloud:true,ai:false,purchases:false,childSessions:true,childConsentVersion:'child-cloud-v1',subscription:{enabled:false}});
  if(path==='/api/auth/otp')return fulfill(route,{sent:true});
  if(path==='/api/auth/verify')return fulfill(route,{access_token:parentToken,refresh_token:parentRefresh,userId:data.email==='other@example.test'?'66666666-6666-4666-a666-666666666666':owner});
  if(path==='/api/sync'){
   const childMode=request.headers().authorization===`Bearer ${childToken}`;
   if(childMode){assert.ok(data.profiles.every(p=>p.id===issuedChildId&&p.kind==='child'));return fulfill(route,{profiles:[...cloudRows.values()].filter(p=>p.id===issuedChildId)});}
   for(const p of data.profiles){let row=cloudRows.get(p.localId);if(!row){if(p.kind==='child'){assert.equal(p.childConsent,true);assert.equal(p.childConsentVersion,'child-cloud-v1');}row={id:randomUUID(),localId:p.localId};}Object.assign(row,{name:p.name,kind:p.kind,language:p.language,goal:p.goal,completed:p.completed||{},days:p.days||[]});cloudRows.set(p.localId,row);}
   return fulfill(route,{profiles:[...cloudRows.values()]});
  }
  if(path==='/api/child-session'){assert.equal(request.headers().authorization,`Bearer ${parentToken}`);assert.equal(data.consent,true);issuedChildId=data.profileId;return fulfill(route,{access_token:childToken,userId:owner,scope:'child',childProfileId:issuedChildId,expires_at:Math.floor(Date.now()/1000)+86400});}
  if(path==='/api/child-session/revoke'){assert.equal(request.headers().authorization,`Bearer ${parentToken}`);revoked=true;return fulfill(route,{revoked:true});}
  return route.continue();
 });
 await onboard(cloudPage);await cloudPage.locator('nav [data-nav="family"]').click();await cloudPage.locator('[data-action="login"]').click();
 await cloudPage.locator('#email').fill('parent@example.test');await cloudPage.locator('#send-code').click();await cloudPage.locator('#otp').fill('123456');await cloudPage.locator('#verify-form button').click();
 const account=()=>cloudPage.evaluate(id=>JSON.parse(localStorage.getItem('ilmigo-v2:'+id)),owner);
 await cloudPage.waitForFunction(id=>JSON.parse(sessionStorage.getItem('ilmigo-auth'))?.userId===id,owner);
 const before=await account(),parentId=before.active,pinAnswers=['284619','284619'];
 cloudPage.on('dialog',async dialog=>{if(dialog.type()==='confirm'){await dialog.accept();return;}if(!pinAnswers.length){failures.push('Unexpected cloud parent PIN dialog');await dialog.dismiss();}else await dialog.accept(pinAnswers.shift());});
 await cloudPage.locator('[data-action="add-profile"]').click();await cloudPage.locator('#child-name').fill('Cloud child');await cloudPage.locator('#parent-consent').check();await cloudPage.locator('#child-form button').click();
 await cloudPage.waitForFunction(()=>JSON.parse(sessionStorage.getItem('ilmigo-auth'))?.scope==='child');
 const stored=await cloudPage.evaluate(()=>sessionStorage.getItem('ilmigo-auth'));assert.ok(!stored.includes(parentToken));assert.ok(!stored.includes(parentRefresh));assert.equal(JSON.parse(stored).refresh_token,undefined);
 const pinBefore=await cloudPage.evaluate(id=>JSON.parse(localStorage.getItem('ilmigo-v2:'+id+':parent')).hash,owner);
 pinAnswers.push('284619');await cloudPage.locator(`[data-profile="${parentId}"]`).click();await cloudPage.locator('#email').fill('other@example.test');await cloudPage.locator('#send-code').click();await cloudPage.locator('#otp').fill('123456');await cloudPage.locator('#verify-form button').click();
 await cloudPage.getByText('Verify the parent email for this account.',{exact:true}).waitFor();assert.equal(await cloudPage.evaluate(()=>JSON.parse(sessionStorage.getItem('ilmigo-auth')).scope),'child');
 await cloudPage.locator('#email').fill('parent@example.test');await cloudPage.locator('#send-code').click();await cloudPage.locator('#otp').fill('123456');await cloudPage.locator('#verify-form button').click();
 await cloudPage.waitForFunction(()=>JSON.parse(sessionStorage.getItem('ilmigo-auth'))?.scope!=='child');assert.equal((await account()).active,parentId);
 assert.deepEqual(await cloudPage.evaluate(id=>JSON.parse(localStorage.getItem('ilmigo-v2:'+id+':parent')).hash,owner),pinBefore);
 await cloudPage.locator('[data-action="revoke-child-sessions"]').click();await cloudPage.getByText('Child sessions ended. Progress was kept.',{exact:true}).waitFor();assert.equal(revoked,true);
 scenarios.push('Mocked cloud UI: explicit child consent, parent-token removal, same-owner email return and revocation');
 let stalledRoute,stalledCalls=0;
 await cloudPage.route('**/api/qa-stalled',route=>{stalledRoute=route;stalledCalls++;});
 const beforeTimeoutAuth=await cloudPage.evaluate(()=>sessionStorage.getItem('ilmigo-auth'));
 const timeoutMessage=await cloudPage.evaluate(async()=>{
  const {ApiSession}=await import('/shared/session.mjs');
  const client=new ApiSession({getSession:()=>null,setSession:()=>false,timeoutMs:1000});
  try{await client.request('/api/qa-stalled',{confirm:true});return 'unexpected success';}catch(error){return error.message;}
 });
 assert.match(timeoutMessage,/took too long/);assert.equal(stalledCalls,1,'A timeout must not replay the request');
 await stalledRoute?.abort().catch(()=>{});
 assert.equal(await cloudPage.evaluate(()=>sessionStorage.getItem('ilmigo-auth')),beforeTimeoutAuth);
 scenarios.push('Actual browser HTTP: stalled request aborts once without replay or credential loss');
 // Course studio uses the same tab session but must rotate expired tokens and
 // display authorization failures without turning a read into a publish action.
 const adminToken='qa-admin-refreshed-access',adminRefresh='qa-admin-refreshed-refresh';
 let adminReads=0,adminWrites=0,adminRefreshes=0;
 await cloudPage.route('**/api/auth/refresh',async route=>{
  adminRefreshes++;const request=route.request();assert.equal(request.headers().authorization,undefined);
  assert.deepEqual(request.postDataJSON(),{refresh_token:parentRefresh,expectedUserId:owner});
  return fulfill(route,{access_token:adminToken,refresh_token:adminRefresh,userId:owner});
 });
 await cloudPage.route('**/api/admin/courses',async route=>{
  const request=route.request();
  if(request.method()!=='GET'){adminWrites++;return fulfill(route,{error:'No publication is authorized in this read-only fixture.'},403);}
  adminReads++;
  if(adminReads===1){assert.equal(request.headers().authorization,`Bearer ${parentToken}`);return fulfill(route,{error:'Your session has expired.'},401);}
  assert.equal(request.headers().authorization,`Bearer ${adminToken}`);
  return adminReads===2?fulfill(route,{courses:[{language:'en',status:'draft',lessons:[lesson]}]}):fulfill(route,{error:'A course administrator account is required.'},403);
 });
 await cloudPage.goto('http://127.0.0.1:3000/admin.html',{waitUntil:'domcontentloaded'});
 await cloudPage.locator('#load').click();
 await cloudPage.waitForFunction(()=>{try{return JSON.parse(document.querySelector('#result').textContent).courses?.[0]?.status==='draft';}catch{return false;}});
 const rotated=await cloudPage.evaluate(()=>JSON.parse(sessionStorage.getItem('ilmigo-auth')));
 assert.equal(rotated.userId,owner);assert.equal(rotated.access_token,adminToken);assert.equal(rotated.refresh_token,adminRefresh);
 assert.equal(adminRefreshes,1);assert.equal(adminReads,2);assert.equal(adminWrites,0);
 assert.equal(await cloudPage.locator('#status').inputValue(),'draft','Loading data must not promote the editor status');
 await cloudPage.locator('#load').click();await cloudPage.getByText('A course administrator account is required.',{exact:true}).waitFor();
 assert.equal(await cloudPage.locator('#load').isDisabled(),false);assert.equal(await cloudPage.locator('#save').isDisabled(),false);
 assert.equal(adminWrites,0,'Read-only studio navigation must not publish or save a course');
 await cloudPage.screenshot({path:new URL('course-studio.png',out).pathname,fullPage:true});
 scenarios.push('Mocked course studio: session refresh persists, drafts remain read-only and role denial recovers controls');

 // A fresh context has no existing worker. Seed another app's cache before
 // activating the real worker to prove it only removes its own old namespace.
 const workerContext=await browser.newContext(),workerPage=currentPage=await workerContext.newPage();workerPage.setDefaultTimeout(15000);
 workerPage.on('pageerror',error=>failures.push(error.message));
 await workerPage.route('https://fonts.googleapis.com/**',route=>route.abort());await workerPage.route('https://fonts.gstatic.com/**',route=>route.abort());
 await workerPage.goto('http://127.0.0.1:3000/admin.html',{waitUntil:'domcontentloaded'});
 const cacheKeys=await workerPage.evaluate(async()=>{
  await caches.open('qa-other-application-v1');await caches.open('ilmigo-v-qa-old');
  const registration=await navigator.serviceWorker.register('/sw.js');
  const worker=registration.installing||registration.waiting||registration.active;
  if(worker.state!=='activated')await new Promise((resolve,reject)=>{
   worker.addEventListener('statechange',()=>{if(worker.state==='activated')resolve();else if(worker.state==='redundant')reject(Error('Worker installation failed'));});
  });
  return caches.keys();
 });
 assert.ok(cacheKeys.includes('qa-other-application-v1'),'Worker activation must preserve unrelated applications');
 assert.ok(!cacheKeys.includes('ilmigo-v-qa-old'),'Worker activation must retire its own old namespace');
 assert.ok(cacheKeys.some(key=>key.startsWith('ilmigo-v')),'The worker must install its current offline cache');
 await workerContext.close();
 scenarios.push('Actual service worker activation: own old caches removed, unrelated same-origin cache preserved');
 const expansionContext=await browser.newContext({viewport:{width:1280,height:900}}),expansionPage=currentPage=await expansionContext.newPage();expansionPage.setDefaultTimeout(15000);
 await onboard(expansionPage,'en','pa');
 const expansionLanguages=catalog.languages.filter(l=>!['en','ur'].includes(l.id));
 assert.equal(expansionLanguages.length,32);
 for(const language of expansionLanguages){
  await expansionPage.locator('nav [data-nav="languages"]').click();
  await expansionPage.locator(`[data-language="${language.id}"]`).click();
  assert.equal((await active(expansionPage)).language,language.id);
  await expansionPage.locator('nav [data-nav="path"]').click();
  const first=catalog.lessons.find(l=>l.language===language.id&&l.order===0);
  assert.ok(first);await expansionPage.locator(`[data-lesson="${first.id}"]`).first().click();
  await expansionPage.locator('#next-block').click();await expansionPage.locator('#next-block').click();
  assert.equal(await expansionPage.locator('.read-text').getAttribute('dir'),language.direction);
  assert.equal((await expansionPage.locator('.read-text').textContent()).trim(),first.reading);
  await expansionPage.locator('#next-block').click();await expansionPage.locator('#writing-response').fill('Foundation practice draft '+language.id);
  await expansionPage.locator('#next-block').click();await answer(expansionPage,first);
  await expansionPage.locator('.large-stat').waitFor();await expansionPage.locator('#overlay [data-action="close"]').click();
  assert.equal((await active(expansionPage)).completed[first.id].score,1);
 }
 await expansionPage.reload({waitUntil:'domcontentloaded'});await expansionPage.locator('nav [data-nav="path"]').waitFor();
 assert.equal(Object.keys((await active(expansionPage)).completed).length,32);
 await expansionPage.screenshot({path:new URL('foundation-courses.png',out).pathname,fullPage:true});
 scenarios.push('All 32 foundation languages: select, open reading with correct direction, save writing, pass quiz, persist progress across reload');
 assert.deepEqual(failures,[],'Browser application errors');
 await writeFile(new URL('checks.json',out),JSON.stringify({browser:browser.version(),scenarios,result:'passed',liveProviders:false,physicalDevice:false},null,2)+'\n');
 console.log(`Browser smoke passed: ${scenarios.length} scenarios; Chromium ${browser.version()}.`);
}catch(error){
 if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:new URL('failure.png',out).pathname,fullPage:true}).catch(()=>{});
 throw error;
}finally{await browser.close();}
