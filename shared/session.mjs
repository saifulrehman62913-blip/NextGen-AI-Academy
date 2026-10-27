// Browser session rotation is account-bound; tokens never enter progress exports.
export class ApiSession {
  constructor({getSession,setSession,fetcher=(...args)=>fetch(...args),timeoutMs=30000}){if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw TypeError('A positive request timeout is required.');this.getSession=getSession;this.setSession=setSession;this.fetcher=fetcher;this.timeoutMs=timeoutMs;this.refreshes=new WeakMap();}
  async send(path,body,token){
    const controller=new AbortController();let timer;
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('The service took too long. Please try again.'));controller.abort();},this.timeoutMs);});
    const transfer=(async()=>{
      const response=await this.fetcher(path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body}),signal:controller.signal});
      // Keep the deadline active through body download, not just HTTP headers.
      const raw=await response.text();
      return {status:response.status,ok:response.ok,json:async()=>JSON.parse(raw)};
    })();
    try{return await Promise.race([transfer,timeout]);}
    catch(error){if(controller.signal.aborted)throw Error('The service took too long. Please try again.');throw Error('Could not connect to the service. Check your connection and try again.');}
    finally{clearTimeout(timer);}
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
