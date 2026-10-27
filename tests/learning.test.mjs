import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyState,validateState,profile,nextLesson,completeLesson,totalXP,streak,dayKey,dailyMinutes,compareTranscript} from '../shared/learning.mjs';
const catalog=JSON.parse(await readFile(new URL('../shared/catalog.json',import.meta.url)));
const mobile=JSON.parse(await readFile(new URL('../mobile/assets/catalog.json',import.meta.url)));
test('catalog: 34 distinct languages, structured bilingual samples, 30-minute plan',()=>{
 assert.equal(catalog.languages.length,34);assert.equal(new Set(catalog.languages.map(l=>l.id)).size,34);
 assert.equal(catalog.blocks.reduce((n,b)=>n+b.minutes,0),30);
 assert.equal(catalog.lessons.length,40);assert.deepEqual(catalog,mobile);
 assert.deepEqual(catalog.languages.find(l=>l.id==='ps').variants,['Swabi Pashto']);
 for(const lesson of catalog.lessons){assert.ok(lesson.titleUr);assert.ok(lesson.objectiveUr);assert.ok(lesson.quiz.options.includes(lesson.quiz.answer));assert.equal(new Set(lesson.quiz.options).size,lesson.quiz.options.length);assert.ok(lesson.words.every(w=>w.text&&w.meaning&&w.meaningUr&&w.transliteration));assert.ok(['sample','draft'].includes(lesson.status));}
 for(const language of catalog.languages.filter(l=>l.status==='coming_soon'))assert.equal(catalog.lessons.filter(l=>l.language===language.id).length,0);
});
test('quiz errors never award completion, repetitions never inflate XP',()=>{const p=profile(emptyState()),l=nextLesson(catalog,p),date=new Date(2026,9,26);assert.equal(completeLesson(p,l,'wrong',date),false);assert.equal(totalXP(p),0);assert.equal(completeLesson(p,l,l.quiz.answer,date),true);assert.equal(totalXP(p),30);completeLesson(p,l,l.quiz.answer,date);assert.equal(totalXP(p),30);assert.equal(p.days.length,1);assert.notEqual(nextLesson(catalog,p).id,l.id);assert.equal(dailyMinutes(p,catalog,date),30);});
test('new learner has zero progress and does not inherit family history',()=>{const s=emptyState();assert.equal(totalXP(profile(s)),0);completeLesson(profile(s),catalog.lessons[0],catalog.lessons[0].quiz.answer);s.profiles.push({...structuredClone(emptyState().profiles[0]),id:'child',kind:'child'});s.active='child';assert.equal(totalXP(profile(s)),0);assert.equal(profile(s).days.length,0);});
test('streak handles months, leap days, today and yesterday',()=>{assert.equal(streak(['2026-09-30','2026-10-01'],new Date(2026,9,2)),2);assert.equal(streak(['2026-09-30','2026-10-01'],new Date(2026,9,3)),0);assert.equal(streak(['2024-02-28','2024-02-29','2024-03-01'],new Date(2024,2,1)),3);assert.equal(dayKey(new Date(2026,0,1)),'2026-01-01');});
test('corrupt storage recovers and invalid active profile cannot crash app',()=>{assert.equal(profile(validateState(null)).name,'Learner');assert.equal(profile(validateState({version:1,profiles:[]})).name,'Learner');const s=emptyState();s.active='gone';s.ui='unexpected';const recovered=validateState(s);assert.equal(recovered.active,s.profiles[0].id);assert.equal(recovered.ui,'en');});
test('transcript comparison handles punctuation and Urdu without claiming pronunciation',()=>{assert.deepEqual(compareTranscript('Hello! How are you?','hello how are you'),{matched:4,total:4,missing:[]});assert.equal(compareTranscript('آپ کیسے ہیں؟','آپ کیسے ہیں').matched,3);assert.equal(compareTranscript('I read every day','I read').matched,2);assert.equal(compareTranscript('Hello','').matched,0);});
