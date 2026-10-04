import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-ai-post-contract.json","utf8"));
const failures=[],timeoutMs=10000;
if(contract.max_redirects!==0) failures.push("production AI POST checks must not follow redirects");
for(const item of contract.checks){
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{method:item.method,redirect:"manual",signal:controller.signal,headers:{"origin":item.origin,"content-type":item.content_type,"user-agent":"jawed-production-ai/38J"},body:JSON.stringify(item.body)});
  const type=(response.headers.get("content-type")||"").toLowerCase();
  if(response.status!==item.expected_status) failures.push(`${item.path}: expected HTTP ${item.expected_status}, got ${response.status}`);
  if(!type.startsWith("application/json")) failures.push(`${item.path}: expected JSON response, got ${type||"missing"}`);
  let json;
  try{json=await response.json()}catch{failures.push(`${item.path}: response is not valid JSON`);continue}
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
if(failures.length){console.error("Production AI POST Reliability Gate FAILED");for(const failure of failures)console.error("- "+failure);process.exit(1)}
console.log("Production AI POST Reliability Gate PASSED");
console.log(`Origin: ${contract.production_origin}`);
console.log("Provider allocation consumed: no (request rejected before provider path).");
