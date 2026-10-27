// Read-only public paid-deployment smoke. No login, AI, purchase or bank request.
import {pathToFileURL} from 'node:url';
export async function checkDeployment(value,{fetcher=fetch}={}){
 let origin;try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error();origin=url.origin;}catch{throw Error('Set an HTTPS deployment origin without a path, credentials, query or fragment.');}
 const issues=[],checks=[];
 async function check(name,path,expected,verify,options={}){
  try{const response=await fetcher(origin+path,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});if(response.status!==expected)throw Error();if(verify&&!await verify(response))throw Error();checks.push(name);}catch{issues.push(name+' failed.');}
 }
 await check('HTML security headers','/',200,async r=>(r.headers.get('content-security-policy')||'').includes("frame-ancestors 'none'")&&r.headers.get('x-content-type-options')==='nosniff'&&/ILMIGO/.test(await r.text()));
 await check('Paid public configuration','/api/config',200,async r=>{const c=await r.json(),p=c.subscription;return c.cloud===true&&c.ai===true&&c.purchases===true&&c.childSessions===true&&p?.enabled===true&&p.amountMinor===1000&&p.currency==='USD'&&p.interval==='year'&&p.trialDays===3&&p.trialAutoCharges===false&&r.headers.get('cache-control')==='no-store';});
 const metadata=async r=>{const c=await r.json();return Array.isArray(c.lessons)&&c.lessons.length===0&&Array.isArray(c.languages)&&c.languages.length>=34;};
 await check('Public lessons protected','/api/catalog',200,metadata);
 await check('Bundled lessons protected','/shared/catalog.json',200,metadata);
 await check('Member catalog requires sign-in','/api/member-catalog',401);
 await check('Membership requires sign-in','/api/entitlements',401);
 await check('OTP refuses GET','/api/auth/otp',405);
 await check('Secret file not served','/.env',404);
 await check('Cross-origin API refused','/api/config',403,null,{headers:{Origin:'https://untrusted.invalid'}});
 return {checks,issues,passed:issues.length===0,note:'Public HTTP checks only; OTP delivery, live AI, database isolation, purchases, payout and store signing are not verified.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const result=await checkDeployment(process.env.API_BASE_URL);for(const issue of result.issues)console.error(issue);console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}
}
