async function readBoundedText(response,maxBytes){
 const declared=Number(response.headers.get("content-length"));
 if(Number.isInteger(declared)&&declared>maxBytes)throw new Error("response exceeds declared body limit");
 if(!response.body){
  const text=await response.text();
  if(new TextEncoder().encode(text).byteLength>maxBytes)throw new Error("response exceeds body limit");
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

const contract=JSON.parse(fs.readFileSync("config/production-ai-get-contract.json","utf8"));
const failures=[];
const validOrigin=typeof contract.production_origin==="string"&&isHttpsOrigin(contract.production_origin);
const url=validPath&&validOrigin?new URL(contract.path,contract.production_origin):null;
if(!isHttpsOrigin(contract.production_origin)) failures.push("production AI GET origin must be an origin-only HTTPS URL");
if(contract.max_redirects!==0) failures.push("production AI GET checks must not follow redirects");
if(typeof contract.path!=="string"||!contract.path.startsWith("/")||contract.path.startsWith("//")||contract.path.includes("\\")||/(^|\/)\.{1,2}(?:$|\/)/.test(contract.path)||/(^|\/)(?:%2e){1,2}(?:$|\/)/i.test(contract.path)) failures.push("production AI GET path must be an absolute site path");
if(contract.method!=="GET") failures.push("production AI GET contract must use GET");
if(!Number.isInteger(contract.expected_status)||contract.expected_status<100||contract.expected_status>599) failures.push("production AI GET expected_status must be a valid HTTP status");
if(typeof contract.expected_content_type!=="string"||!contract.expected_content_type.trim()) failures.push("production AI GET expected_content_type must be non-empty");
if(!Array.isArray(contract.required_fields)||contract.required_fields.length<1) failures.push("production AI GET required_fields must contain at least one field");
if(!Array.isArray(contract.expected_status_values)||contract.expected_status_values.length<1) failures.push("production AI GET expected_status_values must contain at least one value");

if(!Number.isInteger(contract.max_body_bytes)||contract.max_body_bytes<=0) failures.push("production AI GET max_body_bytes must be a positive integer");
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),10000);
try{
 if(!url){failures.push("production AI GET URL cannot be constructed from an invalid contract");throw new Error("invalid production AI GET URL contract")}
 const response=await fetch(url,{method:"GET",redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-ai-get/38S","accept":"application/json"}});
 if(response.status!==contract.expected_status) failures.push("unexpected HTTP status "+response.status);
 if(response.status>=300&&response.status<400) failures.push("unexpected redirect");
 const contentType=(response.headers.get("content-type")||"").toLowerCase();
 if(!contentType.startsWith(contract.expected_content_type)) failures.push("unexpected content-type "+(contentType||"missing"));
 const cacheControl=(response.headers.get("cache-control")||"").toLowerCase();
 if(contract.require_no_store&&!cacheControl.includes("no-store")) failures.push("expected no-store cache policy, got "+(cacheControl||"missing"));
 if(contract.require_nosniff&&(response.headers.get("x-content-type-options")||"").toLowerCase()!=="nosniff") failures.push("missing x-content-type-options: nosniff");
 const headerRequestId=(response.headers.get("x-request-id")||"").trim();
 if(contract.require_request_id_header&&!headerRequestId) failures.push("missing x-request-id header");
 const bodyText=await readBoundedText(response,contract.max_body_bytes);
 let body;
 try{body=JSON.parse(bodyText)}catch{failures.push("response body is not valid JSON");body=null}
 if(body){
  for(const field of contract.required_fields) if(!(field in body)) failures.push("missing required field "+field);
  if(body.service!==contract.expected_service) failures.push("unexpected service "+String(body.service));
  if(!contract.expected_status_values.includes(body.status)) failures.push("unexpected status "+String(body.status));
  if(contract.require_nonempty_model&&(typeof body.model!=="string"||!body.model.trim())) failures.push("model is missing or empty");
  if(contract.require_positive_knowledge_entries&&(!Number.isInteger(body.knowledge_entries)||body.knowledge_entries<1)) failures.push("knowledge_entries is not a positive integer");
  if(contract.require_rate_limit_shape){const rate=body.rate_limit;if(!rate||!Number.isInteger(rate.requests)||rate.requests<1||!Number.isInteger(rate.window_seconds)||rate.window_seconds<1||rate.best_effort!==true) failures.push("rate_limit shape is invalid");}
  if(contract.require_body_request_id_match){if(typeof body.request_id!=="string"||!body.request_id.trim()) failures.push("body request_id is missing or empty");else if(headerRequestId&&body.request_id!==headerRequestId) failures.push("body request_id does not match x-request-id");}
 }
}catch(error){failures.push(error?.name==="AbortError"?"request timed out":error?.message||"request failed")}finally{clearTimeout(timer)}
if(failures.length){console.error("Production AI GET Runtime Reliability Gate FAILED");for(const failure of failures) console.error("- "+failure);process.exit(1)}
console.log("Production AI GET Runtime Reliability Gate PASSED");
console.log("Checked GET "+contract.path+" response contract");
