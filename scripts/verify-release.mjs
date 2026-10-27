import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(new URL('../review/build/',import.meta.url),{recursive:true});
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const report={version,checkedAt:new Date().toISOString(),host:process.platform,steps:[],overall:'pending',note:'Node tests include mocked providers and synthetic DOM, not live services or real-device/browser QA.'};
async function run(name,command,args,options={}){
 const result=await new Promise(resolve=>{
  const child=spawn(command,args,{cwd:options.cwd||root,timeout:options.timeout||120000,stdio:['ignore','inherit','inherit']});
  let output='',error=null;
  child.stdout?.on('data',chunk=>output+=chunk.toString());child.stderr?.on('data',chunk=>output+=chunk.toString());
  child.once('error',err=>{error=err;});child.once('close',status=>resolve({status,error,output}));
 });
 const blocked=['ENOENT','EPERM','EACCES'].includes(result.error?.code);
 const status=blocked?'blocked':!result.error&&result.status===0?'passed':'failed';
 report.steps.push({name,status,exitCode:result.status,command:[command,...args],...(result.error?{reason:result.error.code||result.error.message}:{})});
 return {status,output:result.output+(result.error?String(result.error):'')};
}
function block(name,reason){report.steps.push({name,status:'blocked',reason});}
let logs='ILMIGO release verification\n';
for(const [name,command,args]of [
 ['curriculum-generation','python3',['scripts/build_curriculum.py']],
 ['preview-package','python3',['scripts/package_preview.py']],
 ['javascript-syntax',process.execPath,['scripts/check-js.mjs']],
 ['python-syntax','python3',['-m','py_compile','scripts/course_units.py','scripts/build_curriculum.py','scripts/create_content.py','scripts/bootstrap_mobile.py','scripts/package_preview.py']]
]){const r=await run(name,command,args);logs+=`\n[${name}: ${r.status}]\n${r.output}`;}
const tests=(await readdir(new URL('../tests/',import.meta.url))).filter(f=>f.endsWith('.test.mjs')).sort().map(f=>`tests/${f}`);
await writeFile(new URL('../review/build/node-tests.log',import.meta.url),'');
const node=await run('node-tests',process.execPath,['--test','--test-isolation=none','--test-reporter=spec','--test-reporter-destination=review/build/node-tests.log',...tests]);
node.output=await readFile(new URL('../review/build/node-tests.log',import.meta.url),'utf8');logs+=`\n[node-tests: ${node.status}]\n${node.output}`;
const counts=node.output.match(/tests (\d+)[\s\S]*?pass (\d+)[\s\S]*?fail (\d+)/);if(counts)report.nodeTests={total:Number(counts[1]),passed:Number(counts[2]),failed:Number(counts[3])};
const sdk=await run('flutter-sdk','flutter',['--version']);logs+=`\n[flutter-sdk: ${sdk.status}]\n${sdk.output}`;
// Make an explicit bootstrap attempt even when SDK detection fails; report its
// precise output. Never silently turn a missing tool into a successful build.
const bootstrap=await run('mobile-bootstrap','python3',['scripts/bootstrap_mobile.py'],{timeout:180000});
if(sdk.status==='blocked'&&bootstrap.status==='failed')report.steps.at(-1).status='blocked';
logs+=`\n[mobile-bootstrap]\n${bootstrap.output}`;
if(sdk.status==='passed'&&bootstrap.status==='passed'){
 for(const [name,args]of [['flutter-analysis',['analyze','--no-fatal-infos','--no-fatal-warnings']],['flutter-tests',['test']],['android-debug-build',['build','apk','--debug']]]){const r=await run(name,'flutter',args,{cwd:root+'mobile',timeout:900000});logs+=`\n[${name}: ${r.status}]\n${r.output}`;}
 if(process.platform==='darwin'){const r=await run('ios-simulator-build','flutter',['build','ios','--simulator','--no-codesign'],{cwd:root+'mobile',timeout:900000});logs+=`\n[ios-simulator-build: ${r.status}]\n${r.output}`;}else block('ios-simulator-build','A macOS host with Xcode is required.');
}else{
 for(const name of ['flutter-analysis','flutter-tests','android-debug-build'])block(name,'Flutter SDK/dependencies are unavailable; native compilation was not performed.');
 block('ios-simulator-build','Requires Flutter and macOS/Xcode; current host cannot build iOS.');
}
const failed=report.steps.some(s=>s.status==='failed'),blocked=report.steps.some(s=>s.status==='blocked');
report.overall=failed?'failed':blocked?'partial_native_blocked':'passed';
await writeFile(new URL('../review/build/verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
await writeFile(new URL('../review/build/verification.log',import.meta.url),logs);
console.log(JSON.stringify({overall:report.overall,nodeTests:report.nodeTests,steps:report.steps.map(s=>({name:s.name,status:s.status})),report:'review/build/verification.json'},null,2));
process.exit(failed?1:blocked?2:0);
