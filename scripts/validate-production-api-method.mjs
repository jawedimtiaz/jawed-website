async function readBoundedText(response,maxBytes){
 const declared=Number(response.headers.get("content-length"));
 if(Number.isInteger(declared)&&declared>maxBytes)throw new Error("response exceeds declared body limit");
 if(!response.body){
  const text=await response.text();
  if(Buffer.byteLength(text)>maxBytes)throw new Error("response exceeds body limit");
  return text;
 }
 const reader=response.body.getReader(); const chunks=[]; let total=0;
 try{
  while(true){
   const {done,value}=await reader.read(); if(done)break;
   total+=value.byteLength;
   if(total>maxBytes){await reader.cancel();throw new Error("response exceeds body limit");}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 return new TextDecoder().decode(chunks.length===1?chunks[0]:Uint8Array.from(chunks.reduce((all,chunk)=>{for(const byte of chunk)all.push(byte);return all},[])));
}
import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-api-method-contract.json","utf8"));
const failures=[],timeoutMs=10000;
if(typeof contract.production_origin!=="string"||!/^https:\/\//.test(contract.production_origin)) failures.push("production API method origin must be HTTPS");
if(contract.max_redirects!==0) failures.push("production API method checks must not follow redirects");
if(!Array.isArray(contract.checks)||contract.checks.length<1) failures.push("production API method contract must contain at least one check");
for(const item of contract.checks||[]){
 if(typeof item.path!=="string"||!item.path.startsWith("/")||item.path.startsWith("//")) failures.push("API method check path must be an absolute site path");
 if(typeof item.method!=="string"||!/^[A-Z]+$/.test(item.method)) failures.push(item.path+": method must be an uppercase HTTP method");
 if(!Number.isInteger(item.expected_status)||item.expected_status<100||item.expected_status>599) failures.push(item.path+": expected_status must be a valid HTTP status");
}
for(const item of contract.checks||[]){
 if(!Number.isInteger(item.max_body_bytes)||item.max_body_bytes<=0) failures.push(item.method+" "+item.path+": max_body_bytes must be a positive integer");
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{method:item.method,redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-api-method/38N"}});
  const body=await readBoundedText(response,item.max_body_bytes);
  const type=(response.headers.get("content-type")||"").toLowerCase();
  if(response.status!==item.expected_status) failures.push(item.method+" "+item.path+": expected HTTP "+item.expected_status+", got "+response.status);
  if(response.status>=300&&response.status<400) failures.push(item.method+" "+item.path+": unexpected redirect");
  if(Buffer.byteLength(body)>item.max_body_bytes) failures.push(item.method+" "+item.path+": response exceeded body limit");
  if(item.content_type&&!type.startsWith(item.content_type)) failures.push(item.method+" "+item.path+": expected "+item.content_type+", got "+(type||"missing"));
 }catch(error){failures.push(item.method+" "+item.path+": "+(error?.name==="AbortError"?"request timed out":error?.message||"request failed"))}
 finally{clearTimeout(timer)}
}
if(failures.length){console.error("Production API Method Boundary Gate FAILED");for(const failure of failures) console.error("- "+failure);process.exit(1)}
console.log("Production API Method Boundary Gate PASSED");
console.log("Origin: "+contract.production_origin);
console.log("Unsupported method rejected without invoking the supported GET/POST handlers.");
