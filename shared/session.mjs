// Browser session rotation is account-bound; tokens never enter progress exports.
export class ApiSession {
  constructor({getSession,setSession,fetcher=(...args)=>fetch(...args)}){this.getSession=getSession;this.setSession=setSession;this.fetcher=fetcher;this.refreshes=new WeakMap();}
  async send(path,body,token){
    return this.fetcher(path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body})});
  }
  async decode(response){
    let result;try{result=await response.json();}catch{throw Error('Service unavailable. Please try again.');}
    if(!result||typeof result!=='object'||Array.isArray(result))throw Error('Service unavailable. Please try again.');
    if(!response.ok)throw Error(typeof result.error==='string'?result.error:'Request failed. Please try again.');
    return result;
  }
  async refresh(session,originalToken){
    if(this.getSession()!==session)throw Error('Account changed. Please try again.');
    if(session.access_token!==originalToken)return;
    const existing=this.refreshes.get(session);if(existing)return existing;
    const job=(async()=>{
      const response=await this.send('/api/auth/refresh',JSON.stringify({refresh_token:session.refresh_token,expectedUserId:session.userId}));
      const result=await this.decode(response);
      if(this.getSession()!==session)throw Error('Account changed. Please try again.');
      if(result.userId!==session.userId||typeof result.access_token!=='string'||!result.access_token||typeof result.refresh_token!=='string'||!result.refresh_token)throw Error('The refreshed session could not be verified. Sign in again.');
      if(this.setSession(result,session)===false)throw Error('Account changed. Please try again.');
    })();
    this.refreshes.set(session,job);
    try{return await job;}finally{if(this.refreshes.get(session)===job)this.refreshes.delete(session);}
  }
  async request(path,data){
    const publicAuth=path.startsWith('/api/auth/'),session=publicAuth?null:this.getSession(),originalToken=session?.access_token;
    // Serialize once so a retry cannot silently send a subsequently edited form.
    const body=data===undefined?undefined:JSON.stringify(data);
    let response=await this.send(path,body,originalToken);
    if(session&&this.getSession()!==session)throw Error('Account changed. Please try again.');
    if(response.status===401&&session?.refresh_token){
      await this.refresh(session,originalToken);
      response=await this.send(path,body,session.access_token);
    }
    if(session&&this.getSession()!==session)throw Error('Account changed. Please try again.');
    return this.decode(response);
  }
}
