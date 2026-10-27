// Local parent gate; no PIN or hash is included in progress exports/cloud sync.
export class ParentGate {
 constructor(storage,key,cryptoProvider=globalThis.crypto){this.storage=storage;this.key=key;this.crypto=cryptoProvider;}
 get configured(){return Boolean(this.storage.getItem(this.key));}
 async derive(pin,salt){const material=await this.crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);return [...new Uint8Array(await this.crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new Uint8Array(salt),iterations:100000},material,256))];}
 async setup(pin){if(!/^\d{6,12}$/.test(pin))throw Error('Use a parent PIN of 6–12 digits.');const salt=[...this.crypto.getRandomValues(new Uint8Array(16))];const hash=await this.derive(pin,salt);this.storage.setItem(this.key,JSON.stringify({salt,hash,failures:0,until:0}));}
 async verify(pin){const raw=JSON.parse(this.storage.getItem(this.key)||'null');if(!raw)throw Error('A parent must set a PIN before using child profiles.');if(Date.now()<raw.until)throw Error('Too many attempts. Try again in a minute.');const hash=await this.derive(pin,raw.salt);let difference=0;for(let i=0;i<hash.length;i++)difference|=hash[i]^raw.hash[i];const ok=difference===0;raw.failures=ok?0:(raw.failures||0)+1;raw.until=raw.failures>=5?Date.now()+60000:0;if(raw.failures>=5)raw.failures=0;this.storage.setItem(this.key,JSON.stringify(raw));return ok;}
}
// Call only with the identity returned by a successful server OTP verification.
// This proves account ownership for local PIN recovery, not age/parent status.
export function recoverParentAccess(state,verifiedUserId,storage,key){
 if(!state.ownerId||state.ownerId!==verifiedUserId)throw Error('Verify the email for this family account. A different account cannot reset this PIN.');
 const adult=state.profiles.find(p=>p.kind==='adult');
 if(!adult)throw Error('No adult learning profile exists. Sign in on another device to manage this account.');
 storage.removeItem(key);state.active=adult.id;return adult;
}
