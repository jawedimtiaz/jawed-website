import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-robots-contract.json","utf8"));
const failures=[],timeoutMs=10000;
if(typeof contract.production_origin!=="string"||!/^https:\/\//.test(contract.production_origin)) failures.push("production robots origin must be HTTPS");
if(!Array.isArray(contract.checks)||contract.checks.length<1) failures.push("robots contract must contain at least one check");
for(const item of contract.checks||[]){if(typeof item.path!=="string"||!item.path.startsWith("/")) failures.push("robots path must be absolute");if(!Number.isInteger(item.status)||item.status<100||item.status>599) failures.push(`${item.path}: status must be valid`);if(typeof item.content_type!=="string"||!item.content_type.trim()) failures.push(`${item.path}: content_type must be non-empty`);if(!Array.isArray(item.required_directives)||item.required_directives.length<1) failures.push(`${item.path}: required_directives must be non-empty`);}
async function readBoundedText(response,maxBytes){
 const declared=Number(response.headers.get("content-length"));
 if(Number.isInteger(declared)&&declared>maxBytes)throw new Error("response exceeds declared body limit");
 if(!response.body){const text=await response.text();if(Buffer.byteLength(text)>maxBytes)throw new Error("response exceeds body limit");return text;}
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new Error("response exceeds body limit");}chunks.push(value);}}finally{reader.releaseLock();}
 return new TextDecoder().decode(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))));
}
if(contract.max_redirects!==0) failures.push("production checks must not follow redirects");
if(!Number.isInteger(contract.max_body_bytes)||contract.max_body_bytes<=0) failures.push("production max_body_bytes must be a positive integer");
for(const item of contract.checks){
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-robots/39E"}});
  const type=(response.headers.get("content-type")||"").toLowerCase();
  const body=await readBoundedText(response,contract.max_body_bytes);
  if(response.status!==item.status) failures.push(`${item.path}: expected HTTP ${item.status}, got ${response.status}`);
  if(!type.startsWith(item.content_type)) failures.push(`${item.path}: expected content type ${item.content_type}, got ${type||"missing"}`);
  if(response.status>=300&&response.status<400) failures.push(`${item.path}: unexpected redirect`);
  for(const directive of item.required_directives) if(!body.includes(directive)) failures.push(`${item.path}: missing required directive ${directive}`);
  for(const directive of item.forbidden_directives||[]) if(body.includes(directive)) failures.push(`${item.path}: contains forbidden directive ${directive}`);
  if(!body.trim()) failures.push(`${item.path}: response body is empty`);
 }catch(error){failures.push(`${item.path}: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`)}
 finally{clearTimeout(timer)}
}
if(failures.length){console.error("Production Robots Reliability Gate FAILED");for(const failure of failures)console.error("- "+failure);process.exit(1)}
console.log("Production Robots Reliability Gate PASSED");
console.log(`Origin: ${contract.production_origin}`);
console.log(`Robots checks: ${contract.checks.length}`);
