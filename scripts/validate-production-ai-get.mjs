import fs from "node:fs";

const contract=JSON.parse(fs.readFileSync("config/production-ai-get-contract.json","utf8"));
const url=new URL(contract.path,contract.production_origin);
const failures=[];\nif(contract.max_redirects!==0) failures.push("production AI GET checks must not follow redirects");
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),10000);
try{
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
 const bodyText=await response.text();
 if(new TextEncoder().encode(bodyText).byteLength>contract.max_body_bytes) failures.push("response body exceeds maximum size");
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
