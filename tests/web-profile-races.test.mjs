import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../web/app.js',import.meta.url),'utf8');
function load(name,context){const start=source.indexOf(`async function ${name}(`),end=source.indexOf('\n}',start)+2;vm.runInContext(source.slice(start,end),context);}
function setup(){
 const adult={id:'adult',kind:'adult'},child={id:'child',kind:'child',cloudId:'cloud-child'};
 const context=vm.createContext({profileSwitchVersion:0,state:{active:adult.id,profiles:[adult,child]},auth:{userId:'owner',access_token:'parent'},config:{},parentGate:()=>({configured:true}),ensureParentPin:async()=>true,unlockParent:async()=>true,confirm:()=>true,tr:x=>x,syncCloud:async()=>{},api:async()=>({scope:'child',userId:'owner',childProfileId:child.cloudId,access_token:'ilmigo_child_token'}),persistAuth(){},save(){},render(){},refreshMemberCatalog:async()=>{},loginModal(){}});
 context.p=()=>context.state.profiles.find(p=>p.id===context.state.active);load('switchProfile',context);return context;
}
test('selecting current profile cancels an older pending child transition',async()=>{
 const ctx=setup();let resolve,started;const ready=new Promise(r=>started=r);
 ctx.syncCloud=()=>{started();return new Promise(r=>resolve=r);};
 const pending=ctx.switchProfile('child');await ready;await ctx.switchProfile('adult');resolve();await pending;
 assert.equal(ctx.state.active,'adult');assert.equal(ctx.auth.access_token,'parent');
});
test('late child-session reply cannot replace a newer profile selection',async()=>{
 const ctx=setup();let resolve,started;const ready=new Promise(r=>started=r);
 ctx.api=()=>{started();return new Promise(r=>resolve=r);};
 const pending=ctx.switchProfile('child');await ready;await ctx.switchProfile('adult');
 resolve({scope:'child',userId:'owner',childProfileId:'cloud-child',access_token:'ilmigo_child_old'});await pending;
 assert.equal(ctx.state.active,'adult');assert.equal(ctx.auth.access_token,'parent');
});
test('a delayed local PIN check cannot switch a newly opened account',async()=>{
 const ctx=setup();ctx.auth=null;ctx.state.active='child';let resolve;ctx.unlockParent=()=>new Promise(r=>resolve=r);
 const pending=ctx.switchProfile('adult');const replacement={active:'new-adult',profiles:[{id:'new-adult',kind:'adult'}]};ctx.state=replacement;resolve(true);await pending;
 assert.equal(ctx.state,replacement);assert.equal(ctx.state.active,'new-adult');
});
test('member catalog response is discarded when active learner changes within same account',async()=>{
 let resolve;const ctx=setup();ctx.config={subscription:{enabled:true}};ctx.catalog={old:true};ctx.validateCatalog=x=>x;ctx.api=()=>new Promise(r=>resolve=r);load('refreshMemberCatalog',ctx);
 const pending=ctx.refreshMemberCatalog();ctx.state.active='child';resolve({lessons:['old-profile']});await pending;assert.equal(ctx.catalog.old,true);
});
