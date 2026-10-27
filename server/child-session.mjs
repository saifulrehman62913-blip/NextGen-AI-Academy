import {randomBytes,createHash} from 'node:crypto';
export const childConsentVersion='child-cloud-v1';
export function childTokenHash(token){return /^ilmigo_child_[A-Za-z0-9_-]{43}$/.test(token)?createHash('sha256').update(token).digest('hex'):null;}
export function newChildToken(){const token=`ilmigo_child_${randomBytes(32).toString('base64url')}`;return {token,hash:childTokenHash(token)};}
export function childRouteAllowed(method,path){return method==='POST'&&path==='/api/sync'||method==='GET'&&['/api/entitlements','/api/member-catalog'].includes(path);}
