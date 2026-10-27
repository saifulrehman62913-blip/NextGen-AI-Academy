export class ValidationError extends Error { constructor(message){ super(message);this.status=400;this.name='ValidationError'; } }
export function isObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
export function assertObject(value,name='Request'){if(!isObject(value))throw new ValidationError(`${name} must be a JSON object.`);return value;}
export function text(value,name,max=2000){if(typeof value!=='string'||!value.trim()||value.length>max)throw new ValidationError(`${name} must be a non-empty string of at most ${max} characters.`);return value;}
export function validDay(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;}
export function validateLesson(lesson,language){
 const l=assertObject(lesson,'Lesson');text(l.id,'Lesson ID',100);if(!/^[a-z]{2,3}-[a-z0-9-]+$/.test(l.id)||!l.id.startsWith(`${language}-`))throw new ValidationError('Lesson ID must have its language prefix.');
 for(const key of ['title','titleUr','objective','objectiveUr','reading','readingUr','speaking'])text(l[key],`Lesson ${key}`,key.startsWith('reading')?10000:2000);
 if(l.language!==language||!['beginner','elementary','intermediate','advanced','professional'].includes(l.level)||l.premium!==false||l.minutes!==30)throw new ValidationError('This release accepts free 30-minute curriculum lessons at an allowed level in the selected language.');
 if(!Array.isArray(l.words)||l.words.length<1||l.words.length>100)throw new ValidationError('Lesson words must be an array of 1–100 words.');
 for(const w of l.words){assertObject(w,'Word');for(const key of ['text','meaning','meaningUr','transliteration'])text(w[key],`Word ${key}`,1000);}
 function check(q){assertObject(q,'Quiz');text(q.question,'Quiz question');text(q.questionUr,'Urdu quiz question');text(q.answer,'Quiz answer',1000);if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6)throw new ValidationError('Quiz options must be an array of 2–6 strings.');q.options.forEach(o=>text(o,'Quiz option',1000));if(new Set(q.options).size!==q.options.length||!q.options.includes(q.answer))throw new ValidationError('Quiz options must be distinct and contain the answer.');}
 check(l.quiz);
 if(l.checks!==undefined){if(!Array.isArray(l.checks)||l.checks.length<1||l.checks.length>10)throw new ValidationError('Assessment must contain 1–10 questions.');l.checks.forEach(check);}
 for(const key of ['grammar','writing','translation'])if(l[key]!==undefined){assertObject(l[key],key);text(l[key].en,`${key} English`,10000);text(l[key].ur,`${key} Urdu`,10000);}
 if(l.dialogue!==undefined){if(!Array.isArray(l.dialogue)||l.dialogue.length<2||l.dialogue.length>30)throw new ValidationError('Dialogue must contain 2–30 turns.');for(const d of l.dialogue){assertObject(d,'Dialogue');text(d.speaker,'Speaker',40);text(d.text,'Dialogue text');text(d.translation,'Dialogue translation');}}
 if(l.rubric!==undefined){assertObject(l.rubric,'Rubric');for(const language of ['en','ur']){const rows=l.rubric[language];if(!Array.isArray(rows)||rows.length<1||rows.length>10)throw new ValidationError('Invalid rubric.');rows.forEach(r=>text(r,'Rubric item'));}}
 if(l.order!==undefined&&(!Number.isInteger(l.order)||l.order<0))throw new ValidationError('Invalid lesson order.');return l;
}
export function validateCatalog(value){
 const c=assertObject(value,'Catalog');if(c.version!==1||!Array.isArray(c.languages)||!c.languages.length||!Array.isArray(c.lessons)||!Array.isArray(c.blocks)||!Array.isArray(c.levels))throw new ValidationError('Invalid catalog structure.');
 const ids=new Set();for(const l of c.languages){assertObject(l,'Language');text(l.id,'Language ID',10);if(!/^[a-z]{2,3}$/.test(l.id)||ids.has(l.id))throw new ValidationError('Invalid or duplicate language ID.');ids.add(l.id);text(l.name,'Language name');text(l.native,'Native language name');if(!/^[A-Z]{2}$/.test(l.country)||!['sample','coming_soon'].includes(l.status)||!['rtl','ltr'].includes(l.direction)||!Array.isArray(l.variants)||!l.variants.every(v=>typeof v==='string'))throw new ValidationError('Invalid language metadata.');}
 const lessons=new Set();for(const l of c.lessons){if(!ids.has(l?.language))throw new ValidationError('Unknown lesson language.');validateLesson(l,l.language);if(lessons.has(l.id))throw new ValidationError('Duplicate lesson ID.');lessons.add(l.id);}
 if(c.blocks.length!==5||c.blocks.reduce((n,b)=>n+(Number.isInteger(b?.minutes)?b.minutes:NaN),0)!==30)throw new ValidationError('Invalid daily plan.');
 for(const b of c.blocks){text(b.id,'Block ID',30);text(b.title,'Block title');text(b.titleUr,'Urdu block title');if(b.minutes<1)throw new ValidationError('Invalid block duration.');}return c;
}
export function validateSync(data){
 assertObject(data);if(!Array.isArray(data.profiles)||data.profiles.length>12)throw new ValidationError('Send up to 12 learning profiles.');
 const ids=new Set();for(const p of data.profiles){assertObject(p,'Profile');text(p.localId,'Local profile ID',64);if(!/^[a-zA-Z0-9_-]+$/.test(p.localId)||ids.has(p.localId))throw new ValidationError('Invalid or duplicate local profile ID.');ids.add(p.localId);text(p.name,'Profile name',40);if(p.goal===undefined)p.goal='Everyday conversation';else text(p.goal,'Learning goal',80);if(!['adult','child'].includes(p.kind))throw new ValidationError('Invalid profile kind.');if(p.completed!==undefined){assertObject(p.completed,'Completions');if(Object.keys(p.completed).length>10000)throw new ValidationError('Too many completions.');for(const a of Object.values(p.completed)){assertObject(a,'Completion');if(!validDay(a.date))throw new ValidationError('Invalid completion date.');}}
 if(p.days!==undefined&&(!Array.isArray(p.days)||p.days.length>3660||!p.days.every(validDay)))throw new ValidationError('Invalid practice day history.');}return data;
}
