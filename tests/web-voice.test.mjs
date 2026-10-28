import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {speechLocale} from '../shared/learning.mjs';

const source=await readFile(new URL('../web/app.js',import.meta.url),'utf8');
const start=source.indexOf('function speak(text){');
const end=source.indexOf('\nfunction ',start+1);
function setup(code,voices){
 const spoken=[],messages=[];
 const speechSynthesis={getVoices:()=>voices,cancel(){},speak:u=>spoken.push(u)};
 const context=vm.createContext({window:{speechSynthesis},speechSynthesis,speechLocale,
  p:()=>({language:code}),lang:()=>({name:code,native:code}),tr:en=>en,
  toast:message=>messages.push(message),SpeechSynthesisUtterance:function(text){this.text=text;}});
 vm.runInContext(source.slice(start,end),context);
 return {play:()=>vm.runInContext("speak('lesson phrase')",context),spoken,messages,speechSynthesis};
}
test('Listen prefers the target locale and uses its actual installed voice',()=>{
 const exact={lang:'fr_FR'},other={lang:'fr-CA'};
 const result=setup('fr',[other,exact]);result.play();
 assert.equal(result.spoken[0].voice,exact);assert.equal(result.spoken[0].lang,'fr_FR');
 assert.equal(result.spoken[0].text,'lesson phrase');
});
test('Listen supports an available same-language regional voice',()=>{
 const voice={lang:'en-GB'},result=setup('en',[voice]);result.play();
 assert.equal(result.spoken[0].voice,voice);
});
test('Listen never plays a default or a prefix-matched different language',()=>{
 for(const voices of [[],[{lang:'en-US'}],[{lang:'pa-IN'}]]){
  const result=setup('p',voices);result.play();assert.equal(result.spoken.length,0);assert.equal(result.messages.length,1);
 }
 const result=setup('skr',[{lang:'ur-PK'},{lang:'pa-PK'}]);result.play();assert.equal(result.spoken.length,0);
});
test('Listen can retry after voices load and ignores normal playback cancellation',()=>{
 const voices=[],result=setup('ur',voices);result.play();voices.push({lang:'ur-PK'});result.play();
 assert.equal(result.spoken.length,1);result.spoken[0].onerror({error:'interrupted'});assert.equal(result.messages.length,1);
 result.spoken[0].onerror({error:'network'});assert.equal(result.messages.length,2);
 result.speechSynthesis.speak=()=>{throw Error('unavailable');};assert.doesNotThrow(result.play);
});
