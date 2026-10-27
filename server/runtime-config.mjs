// Canonical origins keep copied dashboard URLs and browser Origin headers aligned.
// Errors name fields only; configured values may contain private input.
export function configuredOrigin(value,name) {
  try {
    if(typeof value!=='string'||!value.trim())throw Error();
    const parsed=new URL(value);
    if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw Error();
    const localHosts=['localhost','127.0.0.1','[::1]','10.0.2.2'];
    if(parsed.protocol==='http:'&&!localHosts.includes(parsed.hostname))throw Error();
    return parsed.origin;
  }catch {throw Error(`${name}: expected an HTTPS origin (HTTP only on an explicit local development host) without credentials, path, query or fragment.`);}
}
