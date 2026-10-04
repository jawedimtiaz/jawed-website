import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-ai-post-contract.json","utf8"));
const failures=[],timeoutMs=10000;
if(contract.max_redirects!==0) failures.push("production AI POST checks must not follow redirects");

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
for(const item of contract.checks){
 if(item.method!=="POST") failures.push(`${item.path}: production AI POST contract must use POST`);
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
