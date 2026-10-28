import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gradeLesson,lessonQuestions,courseLessons} from '../shared/learning.mjs';
const catalog=JSON.parse(await readFile(new URL('../shared/catalog.json',import.meta.url)));
test('every language distributes correct answers and rejects fixed-position guessing across its course',()=>{
 for(const language of catalog.languages){
  const lessons=courseLessons(catalog,language.id),positions=[];
  for(const lesson of lessons){for(const q of lessonQuestions(lesson))positions.push(q.options.indexOf(q.answer));assert.equal(gradeLesson(lesson,lessonQuestions(lesson).map(q=>q.answer)).passed,true);}
  assert.ok(new Set(positions).size>=3,language.id);
  for(let position=0;position<4;position++)assert.ok(lessons.some(l=>!gradeLesson(l,lessonQuestions(l).map(q=>q.options[position%q.options.length])).passed),language.id+' constant '+position);
 }
});
test('all new four-check lessons cannot pass by always choosing the first or second answer',()=>{
 for(const l of catalog.lessons.filter(l=>l.scope==='introductory_foundation'))for(const position of [0,1])assert.equal(gradeLesson(l,l.checks.map(q=>q.options[position])).passed,false,l.id);
});
