async function readBoundedBytes(response,maxBytes){
 const declared=Number(response.headers.get("content-length"));
 if(Number.isInteger(declared)&&declared>maxBytes)throw new Error("response exceeds declared body limit");
 if(!response.body){
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength>maxBytes)throw new Error("response exceeds body limit");
  return new Uint8Array(buffer);
 }
 const reader=response.body.getReader(); let total=0; const chunks=[];
 try{
  while(true){
   const {done,value}=await reader.read(); if(done)break;
   total+=value.byteLength;
   if(total>maxBytes){await reader.cancel();throw new Error("response exceeds body limit");}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 return chunks.length===1?chunks[0]:Uint8Array.from(chunks.reduce((all,chunk)=>{for(const byte of chunk)all.push(byte);return all},[]));
}
import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-media-asset-contract.json","utf8"));
const failures=[],timeoutMs=10000;
if(contract.max_redirects!==0) failures.push("production media asset checks must not follow redirects");
if(!Number.isInteger(contract.max_body_bytes)||contract.max_body_bytes<=0) failures.push("production media asset contract max_body_bytes must be a positive integer");
for(const item of contract.checks){
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-media/38Q"}});
  const type=(response.headers.get("content-type")||"").toLowerCase(),body=await readBoundedBytes(response,contract.max_body_bytes),bytes=body.byteLength;
  if(response.status!==item.status) failures.push(`${item.path}: expected HTTP ${item.status}, got ${response.status}`);
  if(item.content_type&&!type.startsWith(item.content_type)) failures.push(`${item.path}: expected content type ${item.content_type}, got ${type||"missing"}`);
  if(response.status>=300&&response.status<400) failures.push(`${item.path}: unexpected redirect`);
  if(bytes<item.min_body_bytes) failures.push(`${item.path}: response is too small (${bytes} bytes)`);
  if(bytes>contract.max_body_bytes) failures.push(`${item.path}: response exceeds body limit`);
 }catch(error){failures.push(`${item.path}: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`)}
 finally{clearTimeout(timer)}
}
if(failures.length){console.error("Production Media Asset Reliability Gate FAILED");for(const f of failures)console.error("- "+f);process.exit(1)}
console.log("Production Media Asset Reliability Gate PASSED");
console.log(`Media assets checked: ${contract.checks.length}`);
