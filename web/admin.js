import {ApiSession} from '/shared/session.mjs';

// Read the tab's session on every operation so a late response cannot replace a
// newer login. Keep a stable object while its stored representation is unchanged.
export function createCourseStudioClient(storage,fetcher){
  let auth=null,serialized;
  function current(){
    let saved;try{saved=storage.getItem('ilmigo-auth');}catch{return null;}
    if(saved!==serialized){
      serialized=saved;auth=null;
      try{const value=JSON.parse(saved);if(typeof value?.userId==='string'&&value.userId&&typeof value?.access_token==='string'&&value.access_token)auth=value;}catch{}
    }
    return auth;
  }
  const client=new ApiSession({getSession:current,fetcher,setSession:(next,expected)=>{
    if(current()!==expected)return false;
    const updated=JSON.stringify({...expected,...next});
    try{storage.setItem('ilmigo-auth',updated);}catch{
      try{storage.removeItem('ilmigo-auth');}catch{/* Storage remains unavailable. */}
      auth=null;serialized=undefined;return false;
    }
    Object.assign(expected,next);auth=expected;serialized=updated;return true;
  }});
  return async function request(method,data){
    const session=current();
    if(!session)throw Error('Sign in from the learning app first.');
    if(session.scope==='child')throw Error('Return to a parent account before opening the course studio.');
    if(!['GET','POST'].includes(method))throw Error('Unsupported course studio request.');
    return client.request('/api/admin/courses',method==='GET'?undefined:data);
  };
}

const result=document.querySelector('#result');
const load=document.querySelector('#load'),save=document.querySelector('#save');
const request=createCourseStudioClient(sessionStorage);
let busy=false;
async function run(operation){
  if(busy)return;
  busy=true;load.disabled=true;save.disabled=true;
  try{result.textContent=JSON.stringify(await operation(),null,2);}
  catch(error){result.textContent=error.message||'The course studio could not complete this request.';}
  finally{busy=false;load.disabled=false;save.disabled=false;}
}
load.onclick=()=>run(()=>request('GET'));
document.querySelector('#course').onsubmit=e=>{
  e.preventDefault();
  return run(()=>request('POST',{
    language:document.querySelector('#language').value.trim(),
    status:document.querySelector('#status').value,
    lessons:JSON.parse(document.querySelector('#lessons').value),
    reviewed:document.querySelector('#reviewed').checked,
    reviewNote:document.querySelector('#note').value,
  }));
};
