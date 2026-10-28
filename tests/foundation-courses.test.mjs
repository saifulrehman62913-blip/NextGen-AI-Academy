import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCatalog} from '../shared/schema.mjs';
import {emptyState,profile,courseLessons,nextLesson,lessonQuestions,completeLesson,totalXP} from '../shared/learning.mjs';
const catalog=JSON.parse(await readFile(new URL('../shared/catalog.json',import.meta.url)));
test('all 32 new languages have three unique usable beginner drafts and honest review metadata',()=>{
 validateCatalog(catalog);assert.equal(catalog.lessons.length,136);assert.equal(catalog.revision,4);
 for(const language of catalog.languages.filter(l=>!['en','ur'].includes(l.id))){
  const lessons=courseLessons(catalog,language.id);assert.equal(language.status,'sample');assert.equal(lessons.length,3);assert.deepEqual(lessons.map(l=>l.order),[0,1,2]);
  assert.equal(new Set(lessons.map(l=>l.reading)).size,3);
  for(const l of lessons){assert.equal(l.level,'beginner');assert.equal(l.reviewStatus,'pending');assert.equal(l.practiceType,'phrase_drill');assert.equal(l.words.length,4);assert.equal(l.checks.length,4);assert.ok(l.usageNote.length>70);assert.equal(l.translation.en.split('\n').length,4);assert.equal(l.translation.ur.split('\n').length,4);}
 }
});
test('each new language progresses, rejects a wrong quiz and keeps replay XP idempotent',()=>{
 for(const language of catalog.languages.filter(l=>!['en','ur'].includes(l.id))){
  const learner=profile(emptyState());learner.language=language.id;
  for(const l of courseLessons(catalog,language.id)){
   assert.equal(nextLesson(catalog,learner).id,l.id);const answers=lessonQuestions(l).map(q=>q.answer),wrong=[...answers];wrong[0]=l.checks[0].options.find(x=>x!==wrong[0]);
   assert.equal(completeLesson(learner,l,wrong),false);assert.equal(completeLesson(learner,l,answers),true);const xp=totalXP(learner);completeLesson(learner,l,answers);assert.equal(totalXP(learner),xp);
  }
  assert.equal(Object.keys(learner.completed).length,3);assert.equal(totalXP(learner),90);
 }
});
