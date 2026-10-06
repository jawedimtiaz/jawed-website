import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-ai-post-contract.json","utf8"));
const failures=[],timeoutMs=10000;
const isHttpsOrigin=value=>{try{const url=new URL(value);return typeof value==="string"&&url.protocol==="https:"&&url.origin===value&&url.username===""&&url.password===""&&url.pathname==="/"&&url.search===""&&url.hash==="";}catch{return false;}};
if(!isHttpsOrigin(contract.production_origin)) failures.push("production AI POST production_origin must be an origin-only HTTPS URL");
if(contract.max_redirects!==0) failures.push("production AI POST checks must not follow redirects");
if(!Array.isArray(contract.checks)||contract.checks.length<1) failures.push("production AI POST contract must contain at least one check");
for(const item of contract.checks||[]){
 if(typeof item.path!=="string"||!item.path.startsWith("/")||item.path.startsWith("//")||item.path.includes("\\")||/(^|\/)\.{1,2}(?:$|\/)/.test(item.path)||/(^|\/)(?:%2e){1,2}(?:$|\/)/i.test(item.path)) failures.push(item.path+": production AI POST path must be an absolute site path");
 if(item.method!=="POST") failures.push(item.path+": production AI POST contract must use POST");
 if(typeof item.origin!=="string"||!/^https:\/\//.test(item.origin)||(()=>{try{const url=new URL(item.origin);return url.origin===item.origin&&url.username===""&&url.password===""&&url.pathname==="/"&&url.search===""&&url.hash==="";}catch{return false;}})() ) failures.push(item.path+": origin must be an origin-only HTTPS URL");
 if(typeof item.content_type!=="string"||item.content_type!=="application/json") failures.push(item.path+": content_type must be application/json");
 if(!Number.isInteger(item.expected_status)||item.expected_status<100||item.expected_status>599) failures.push(item.path+": expected_status must be a valid HTTP status");
 if(typeof item.expected_code!=="string"||!item.expected_code.trim()) failures.push(item.path+": expected_code must be non-empty");
 if(!Number.isInteger(item.max_body_bytes)||item.max_body_bytes<=0) failures.push(item.path+": max_body_bytes must be a positive integer");
 if(!Array.isArray(item.required_headers)||item.required_headers.length<1) failures.push(item.path+": required_headers must contain at least one header");
}

function readBoundedText(response,maxBytes){
 return (async()=>{
  const declared=Number(response.headers.get("content-length"));
  if(Number.isInteger(declared)&&declared>maxBytes) throw new Error("response exceeds declared AI POST body limit");
  if(!response.body){
   const text=await response.text();
   if(Buffer.byteLength(text)>maxBytes) throw new Error("response exceeds AI POST body limit");
   return text;
  }
  const reader=response.body.getReader(),chunks=[];let total=0;
  try{
   while(true){
    const {done,value}=await reader.read();
    if(done) break;
    total+=value.byteLength;
    if(total>maxBytes){await reader.cancel();throw new Error("response exceeds AI POST body limit");}
    chunks.push(value);
   }
  }finally{reader.releaseLock();}
  return new TextDecoder().decode(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))));
 })();
}
for(const item of contract.checks||[]){
 if(item.method!=="POST") failures.push(`${item.path}: production AI POST contract must use POST`);
 const validOrigin=isHttpsOrigin(contract.production_origin);
 const validPath=typeof item.path==="string"&&item.path.startsWith("/")&&!item.path.startsWith("//")&&!item.path.includes("\\")&&!/(^|\/)\.{1,2}(?:$|\/)/.test(item.path)&&!/(^|\/)(?:%2e){1,2}(?:$|\/)/i.test(item.path);
 if(!validPath||!validOrigin){failures.push(`${item.path}: AI POST probe URL is invalid`);continue;}
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{method:item.method,redirect:"manual",signal:controller.signal,headers:{"origin":item.origin,"content-type":item.content_type,"user-agent":"jawed-production-ai/38J"},body:JSON.stringify(item.body)});
  const type=(response.headers.get("content-type")||"").toLowerCase();
  if(response.status!==item.expected_status) failures.push(`${item.path}: expected HTTP ${item.expected_status}, got ${response.status}`);
  if(!type.startsWith("application/json")) failures.push(`${item.path}: expected JSON response, got ${type||"missing"}`);
  let json;
  try{const text=await readBoundedText(response,item.max_body_bytes);json=JSON.parse(text)}catch(error){failures.push(`${item.path}: ${error?.message||"response is not valid JSON"}`);continue}
  if(json.code!==item.expected_code) failures.push(`${item.path}: expected code ${item.expected_code}, got ${json.code||"missing"}`);
  for(const required of item.required_headers||[]){
   const actual=(response.headers.get(required.name)||"").trim();
   if(required.nonempty&&!actual) failures.push(`${item.path}: missing response header ${required.name}`);
   else if(required.includes&&!actual.toLowerCase().includes(required.includes.toLowerCase())) failures.push(`${item.path}: ${required.name} does not include expected value ${required.includes}`);
  }
  if(Object.keys(json).sort().join(",")!=="code,error,request_id") failures.push(`${item.path}: rejected-origin response exposed an unexpected field`);
  const headerRequestId=(response.headers.get("x-request-id")||"").trim();
  if(typeof json.request_id!=="string"||!json.request_id) failures.push(`${item.path}: missing request_id`);
  else if(headerRequestId&&json.request_id!==headerRequestId) failures.push(`${item.path}: body request_id does not match x-request-id`);
 }catch(error){failures.push(`${item.path}: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`)}
 finally{clearTimeout(timer)}
}
if(failures.length){console.error("Production AI POST Reliability Gate FAILED");for(const failure of failures) console.error("- "+failure);process.exit(1)}
console.log("Production AI POST Reliability Gate PASSED");
console.log(`Origin: ${contract.production_origin}`);
console.log("Provider allocation consumed: no (request rejected before provider path).");
