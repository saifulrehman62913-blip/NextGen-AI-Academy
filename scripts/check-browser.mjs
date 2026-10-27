// Runs only in CI with the exact Playwright package installed by the workflow.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=new URL('../review/browser/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
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
 assert.deepEqual(failures,[],'Browser application errors');
 await writeFile(new URL('checks.json',out),JSON.stringify({browser:browser.version(),scenarios,result:'passed',liveProviders:false,physicalDevice:false},null,2)+'\n');
 console.log(`Browser smoke passed: ${scenarios.length} scenarios; Chromium ${browser.version()}.`);
}catch(error){
 if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:new URL('failure.png',out).pathname,fullPage:true}).catch(()=>{});
 throw error;
}finally{await browser.close();}
