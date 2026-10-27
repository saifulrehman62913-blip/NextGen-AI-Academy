import {emptyState,validateState,newProfileId} from './learning.mjs';
export class AccountStore {
 constructor(storage){this.storage=storage;this.owner=null;}
 key(owner=this.owner){return `ilmigo-v2:${owner===null?'guest':encodeURIComponent(owner)}`;}
 open(owner=null){
  if(owner!==null&&(typeof owner!=='string'||!owner))throw Error('A valid account identity is required.');this.owner=owner;
  let raw;try{raw=JSON.parse(this.storage.getItem(this.key()));}catch{}
  // Legacy data is never assigned to an authenticated account automatically.
  if(!raw&&owner===null){try{raw=JSON.parse(this.storage.getItem('ilmigo-v1'));}catch{}if(raw){for(const p of raw.profiles||[])delete p.cloudId;}}
  const state=validateState(raw);state.ownerId=owner;return state;
 }
 has(owner){return Boolean(this.storage.getItem(this.key(owner)));}
 importGuest(state){if(!this.owner||state.ownerId!==this.owner)throw Error('Sign in to your own account first.');const savedOwner=this.owner;const guest=this.open(null);this.owner=savedOwner;if(state.profiles.length+guest.profiles.length>12)throw Error('A family can have up to 12 profiles.');for(const item of guest.profiles){const copy=structuredClone(item);copy.id=newProfileId();delete copy.cloudId;state.profiles.push(copy);}return guest.profiles.length;}
 save(state){if(state.ownerId!==this.owner)throw Error('Account changed. Reload your learning space before syncing.');this.storage.setItem(this.key(),JSON.stringify(state));}
 erase(){this.storage.removeItem(this.key());if(this.owner===null)this.storage.removeItem('ilmigo-v1');}
 remove(owner){this.storage.removeItem(this.key(owner));this.storage.removeItem(`${this.key(owner)}:parent`);}
}
export function mergeProgress(local,remote){
 for(const [id,result]of Object.entries(remote.completed||{})){if(!local.completed[id]||result.date>local.completed[id].date)local.completed[id]=result;}
 local.days=[...new Set([...local.days,...(remote.days||[]),...Object.values(local.completed).map(a=>a.date)])].sort();
 local.cloudId=remote.id;local.name=remote.name;local.kind=remote.kind;local.language=remote.language;local.goal=remote.goal||'Everyday conversation';return local;
}
export function safeStorage(host=globalThis){
 try{const storage=host.localStorage;const probe='ilmigo-storage-probe';storage.setItem(probe,'1');storage.removeItem(probe);return {persistent:true,getItem:k=>storage.getItem(k),setItem:(k,v)=>storage.setItem(k,v),removeItem:k=>storage.removeItem(k)};}catch{
  const data=new Map();return {persistent:false,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 }
}
