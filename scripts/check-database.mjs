// Real PostgreSQL checks in a fresh local CI database; never use a live project.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
if(process.env.ILMIGO_TEST_DATABASE!=='true'||process.env.PGDATABASE!=='ilmigo_ci'||!['127.0.0.1','localhost'].includes(process.env.PGHOST))throw Error('Refusing database setup: requires explicit disposable localhost ilmigo_ci test database.');
async function psql(args){
 return new Promise((resolve,reject)=>{let out='',err='';const child=spawn('psql',['-X','-v','ON_ERROR_STOP=1','-At',...args],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.once('error',reject);child.once('close',code=>code===0?resolve(out.trim()):reject(Error(`Disposable database check failed: ${err}`)));});
}
const sql=statement=>psql(['-c',statement]);
if(await sql("select to_regclass('public.profiles') is not null")!=='f')throw Error('Refusing to reuse a database containing application tables.');
await psql(['-f','tests/database/setup.sql']);
for(const name of ['001_ilmigo.sql','002_review_fixes.sql','003_account_trials.sql','004_child_sessions.sql'])await psql(['-f',`supabase/migrations/${name}`]);
const A='11111111-1111-4111-a111-111111111111',B='22222222-2222-4222-a222-222222222222';
let assertions=0;
async function check(statement){if(await sql(`select (${statement}) is true`)!=='t')throw Error(`Database assertion failed: ${statement}`);assertions++;}
await check("not has_function_privilege('anon','public.start_account_trial(uuid)','EXECUTE')");
await check("not has_function_privilege('authenticated','public.start_account_trial(uuid)','EXECUTE')");
await check("has_function_privilege('service_role','public.start_account_trial(uuid)','EXECUTE')");
await check("not has_table_privilege('anon','public.course_drafts','SELECT')");
await check("not has_table_privilege('authenticated','public.account_trials','INSERT')");
await check("not has_table_privilege('authenticated','public.account_trials','UPDATE')");
await check("not has_table_privilege('authenticated','public.account_trials','DELETE')");
// Concurrent first starts must converge on one row and one original expiry.
const starts=await Promise.all(Array.from({length:6},()=>sql(`set role service_role; select public.start_account_trial('${A}')->>'expires_at'`)));
if(new Set(starts).size!==1)throw Error('Concurrent trial requests returned different expiries.');assertions++;
await check(`(select count(*)=1 from account_trials where owner_id='${A}')`);
await check(`(select expires_at-started_at=interval '72 hours' from account_trials where owner_id='${A}')`);
await sql(`select public.start_account_trial('${B}')`);
await sql(`update account_trials set started_at=now()-interval '100 hours',expires_at=now()-interval '28 hours' where owner_id='${A}'`);
await check(`(select public.start_account_trial('${A}')->>'expires_at')::timestamptz=(select expires_at from account_trials where owner_id='${A}')`);
await check(`(select expires_at<now() from account_trials where owner_id='${A}')`);
// Direct authenticated reads see only their account's trial.
const visible=await sql(`set role authenticated; set request.jwt.claim.sub='${A}'; select owner_id from account_trials`);
if(visible.split('\n').at(-1)!==A||visible.includes(B))throw Error('Trial RLS exposed another account.');assertions++;
await sql(`insert into profiles(id,owner_id,local_key,name,kind) values('33333333-3333-4333-a333-333333333333','${A}','a','A','adult')`);
await sql(`set role service_role; select sync_completion('33333333-3333-4333-a333-333333333333','en-hello',current_date); select sync_completion('33333333-3333-4333-a333-333333333333','en-hello',current_date-1)`);
await check("(select completed_on=current_date from attempts limit 1)");
await check("(select count(*)=2 from practice_days)");
const quota=await Promise.all(Array.from({length:8},()=>sql(`set role service_role; select reserve_ai_turn('${A}',3)`)));
if(quota.filter(v=>v.split('\n').at(-1)==='t').length!==3)throw Error('Concurrent daily quota exceeded three turns.');assertions++;
await check(`(select turns=3 from ai_usage where owner_id='${A}')`);
await check("not has_function_privilege('authenticated','public.reserve_ai_turn(uuid,integer)','EXECUTE')");
await sql(`insert into course_drafts(language,status,lessons,review_note,reviewer_id,reviewer_audit_id) values('en','published','[]','CI fixture','${A}',gen_random_uuid())`);
const courses=await sql(`set role authenticated; set request.jwt.claim.sub='${B}'; select count(*) from course_drafts`);
if(courses.split('\n').at(-1)!=='0')throw Error('General authenticated user read paid course bodies.');assertions++;
// Learning-data deletion keeps trial; auth-account deletion cascades it.
const childA='44444444-4444-4444-a444-444444444444',childB='55555555-5555-4555-a555-555555555555';
await sql(`insert into profiles(id,owner_id,local_key,name,kind,parent_consent_at) values('${childA}','${A}','child-a','CI child A','child',now()),('${childB}','${B}','child-b','CI child B','child',now())`);
await check("not has_function_privilege('authenticated','public.grant_child_session(uuid,uuid,text)','EXECUTE')");
await check("not has_table_privilege('authenticated','public.child_sessions','SELECT')");
await check("not has_table_privilege('anon','public.child_consent_events','SELECT')");
await assert.rejects(sql(`set role service_role; select grant_child_session('${A}','${childB}','${'0'.repeat(64)}')`),/owned child profile/);assertions++;
await Promise.all(Array.from({length:8},(_,i)=>sql(`set role service_role; select grant_child_session('${A}','${childA}','${i.toString(16).padStart(64,'0')}')`)));
await check(`(select count(*)=5 from child_sessions where profile_id='${childA}')`);
await check(`(select bool_and(expires_at-created_at=interval '24 hours') from child_sessions where profile_id='${childA}')`);
await check(`(select parent_consent_version='child-cloud-v1' from profiles where id='${childA}')`);
await check(`(select count(*)=8 from child_consent_events where profile_id='${childA}' and action='grant')`);
await sql(`set role service_role; select grant_child_session('${B}','${childB}','${'f'.repeat(64)}'); select revoke_child_sessions('${A}')`);
await check(`not exists(select 1 from child_sessions where owner_id='${A}')`);
await check(`(select count(*)=1 from child_sessions where owner_id='${B}')`);
await check(`exists(select 1 from child_consent_events where owner_id='${A}' and action='revoke')`);
await sql(`delete from profiles where owner_id='${A}'`);await check(`exists(select 1 from account_trials where owner_id='${A}')`);
await check(`not exists(select 1 from child_consent_events where owner_id='${A}')`);
const families=await Promise.allSettled(Array.from({length:14},(_,i)=>sql(`set role service_role; insert into profiles(owner_id,local_key,name,kind) values('${A}','family-${i}','CI family','adult')`)));
if(families.filter(r=>r.status==='fulfilled').length!==12||families.some(r=>r.status==='rejected'&&!String(r.reason).includes('Family profile limit reached')))throw Error('Concurrent family limit did not preserve exactly 12 profiles.');assertions++;
await sql(`set role service_role; insert into profiles(owner_id,local_key,name,kind) values('${A}',(select local_key from profiles where owner_id='${A}' limit 1),'Retry','adult') on conflict(owner_id,local_key) do nothing`);
await check(`(select count(*)=12 from profiles where owner_id='${A}')`);
await sql(`delete from auth.users where id='${A}'`);await check(`not exists(select 1 from account_trials where owner_id='${A}')`);
await check("(select status='published' and reviewer_id is null and reviewer_audit_id is not null from course_drafts where language='en')");
console.log(`PostgreSQL migrations and ${assertions} integration assertions passed, including actual concurrent trial/quota calls and RLS.`);
