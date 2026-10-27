import {spawn} from 'node:child_process';
import {readdir} from 'node:fs/promises';
for(const dir of ['web','shared','server']){
 for(const file of await readdir(new URL(`../${dir}/`,import.meta.url))){
  if(!/\.m?js$/.test(file))continue;
  const code=await new Promise(resolve=>{const child=spawn(process.execPath,['--check',new URL(`../${dir}/${file}`,import.meta.url).pathname],{stdio:'inherit'});child.once('error',error=>{console.error(`Syntax check could not run: ${error.code}`);resolve(1);});child.once('close',status=>resolve(status??1));});
  if(code!==0)process.exit(code);
 }
}
console.log('All browser, shared and server JavaScript syntax checks passed.');
