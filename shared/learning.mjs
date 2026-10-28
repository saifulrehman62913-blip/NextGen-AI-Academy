import {validDay,isObject} from './schema.mjs';
export const DAY_MS = 86400000;
export function dayKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}
export function newProfileId(){return globalThis.crypto?.randomUUID?.() || `learner-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
export function emptyState() {
  const id=newProfileId();return {version:1, ui:'en', active:id, profiles:[{id,name:'Learner',kind:'adult',language:'en',goal:'Everyday conversation',completed:{},sessions:{},drafts:{},days:[],saved:[],reminders:false}], onboarded:false};
}
export function validateState(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.profiles) || !raw.profiles.length) return emptyState();
  const state = emptyState();
  state.ui = raw.ui === 'ur' ? 'ur' : 'en'; state.onboarded = Boolean(raw.onboarded);
  const seen=new Set();
  state.profiles = raw.profiles.filter(p => p && typeof p.id === 'string' && p.id.length>0 && !seen.has(p.id) && seen.add(p.id)).map(p => ({
    id:p.id,cloudId:typeof p.cloudId==='string'?p.cloudId:undefined,name:String(p.name || 'Learner').slice(0,40),kind:p.kind==='child'?'child':'adult',language:typeof p.language==='string'?p.language:'en',goal:['Everyday conversation','Travel & connections','School & study','Work & interviews'].includes(p.goal)?p.goal:'Everyday conversation',
    completed:isObject(p.completed)?Object.fromEntries(Object.entries(p.completed).filter(([id,a])=>/^[a-z]{2,3}-[a-z0-9-]+$/.test(id)&&isObject(a)&&validDay(a.date)).map(([id,a])=>[id,{date:a.date,score:1}])):{},
    sessions:isObject(p.sessions)?Object.fromEntries(Object.entries(p.sessions).filter(([,a])=>isObject(a)&&Number.isInteger(a.index)&&a.index>=0&&a.index<=4&&Number.isFinite(a.seconds)&&a.seconds>=0)):{},
    drafts:isObject(p.drafts)?Object.fromEntries(Object.entries(p.drafts).filter(([,v])=>typeof v==='string').map(([id,v])=>[id,v.slice(0,4000)])):{},
    days:Array.isArray(p.days)?[...new Set(p.days.filter(validDay))]:[],saved:Array.isArray(p.saved)?p.saved:[],reminders:Boolean(p.reminders)
  }));
  if (!state.profiles.length) return emptyState();
  state.active = state.profiles.some(p=>p.id===raw.active)?raw.active:state.profiles[0].id;
  return state;
}
export function profile(state) { return state.profiles.find(p=>p.id===state.active) || state.profiles[0]; }
export function courseLessons(catalog, language) { return catalog.lessons.filter(l=>l.language===language); }
export function nextLesson(catalog, p) {
  const lessons = courseLessons(catalog,p.language);
  return lessons.find(l=>!p.completed[l.id]) || lessons[0] || null;
}
export function streak(days, now = new Date()) {
  const set = new Set(days); const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!set.has(dayKey(date))) date.setDate(date.getDate()-1);
  let n=0; while(set.has(dayKey(date))) { n++; date.setDate(date.getDate()-1); } return n;
}
export function lessonQuestions(lesson){return lesson.checks||[lesson.quiz];}
export function gradeLesson(lesson,answer){const questions=lessonQuestions(lesson),answers=Array.isArray(answer)?answer:[answer];const correct=questions.filter((q,i)=>answers[i]===q.answer).length;const score=correct/questions.length;return {correct,total:questions.length,score,passed:score>=0.8&&questions.every((q,i)=>q.options.includes(answers[i]))};}
export function completeLesson(p, lesson, answer, now = new Date()) {
  const result=gradeLesson(lesson,answer);if(!result.passed)return false;
  p.completed[lesson.id] = {date:dayKey(now),score:result.score};
  if (!p.days.includes(dayKey(now))) p.days.push(dayKey(now));
  delete p.sessions[lesson.id]; return true;
}
export function totalXP(p) { return Object.keys(p.completed).length * 30; }
export function dailyMinutes(p, catalog, now=new Date()) {
  return p.days.includes(dayKey(now))||catalog.lessons.some(l=>p.completed[l.id]?.date===dayKey(now))?30:0;
}
export function normalizeSpeech(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}]/gu,'').replace(/\s+/g,' ').trim();
}
export function compareTranscript(expected, actual) {
  const target=normalizeSpeech(expected).split(' ').filter(Boolean), said=new Set(normalizeSpeech(actual).split(' ').filter(Boolean));
  if (!target.length || !said.size) return {matched:0,total:target.length,missing:target};
  const missing=target.filter(w=>!said.has(w));return {matched:target.length-missing.length,total:target.length,missing};
}
export function speechLocale(language){return ({en:'en-US',ur:'ur-PK',pa:'pa-PK',sd:'sd-PK',skr:'skr-PK',ps:'ps-AF',fa:'fa-IR',ar:'ar-SA',tr:'tr-TR',hi:'hi-IN',bn:'bn-BD',gu:'gu-IN',ta:'ta-IN',te:'te-IN',ml:'ml-IN',ne:'ne-NP',si:'si-LK',zh:'zh-CN',ja:'ja-JP',ko:'ko-KR',id:'id-ID',ms:'ms-MY',th:'th-TH',vi:'vi-VN',fr:'fr-FR',es:'es-ES',de:'de-DE',it:'it-IT',pt:'pt-PT',ru:'ru-RU',nl:'nl-NL',pl:'pl-PL',sw:'sw-KE',so:'so-SO'})[language]||language;}
