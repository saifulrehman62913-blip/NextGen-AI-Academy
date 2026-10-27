import {createApp} from '../server/server.mjs';
import {Readable,Writable} from 'node:stream';
export async function run(t,settings={},fetcher){
 const server=createApp(settings,fetcher);
 async function send(path,options={}){
  const headers=Object.fromEntries(Object.entries(options.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
  const req=Readable.from(options.body?[Buffer.from(options.body)]:[]);
  Object.assign(req,{url:path,method:options.method||'GET',headers,socket:{remoteAddress:'127.0.0.1'}});
  const chunks=[],responseHeaders={};
  const res=new Writable({write(chunk,encoding,callback){chunks.push(Buffer.from(chunk));callback();}});
  res.setHeader=(k,v)=>{responseHeaders[k.toLowerCase()]=String(v);};
  res.writeHead=(status,extra={})=>{res.statusCode=status;for(const [k,v]of Object.entries(extra))res.setHeader(k,v);};
  const done=new Promise((resolve,reject)=>{res.on('finish',resolve);res.on('error',reject);});
  server.emit('request',req,res);await done;
  return new Response(options.method==='HEAD'?null:Buffer.concat(chunks),{status:res.statusCode||200,headers:responseHeaders});
 }
 return {get:send,post:(path,data,headers={})=>send(path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)})};
}
