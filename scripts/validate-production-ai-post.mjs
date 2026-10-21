import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-ai-post-contract.json","utf8"));
const failures=[];
const safeOrigin=value=>{try{const u=new URL(value);return typeof value==="string"&&u.protocol==="https:"&&u.origin===value&&u.username===""&&u.password===""&&u.pathname==="/"&&!u.search&&!u.hash;}catch{return false;}};
const safePath=value=>typeof value==="string"&&value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\")&&!/(^|\/)\.{1,2}(?:$|\/)/.test(value);
if(!safeOrigin(contract.production_origin))failures.push("retired API boundary origin must be an origin-only HTTPS URL");
if(contract.max_redirects!==0)failures.push("retired API boundary must not follow redirects");
if(!Array.isArray(contract.checks)||!contract.checks.length)failures.push("retired API boundary checks are required");
async function readBoundedText(response,maxBytes){
 const declared=Number(response.headers.get("content-length"));if(Number.isInteger(declared)&&declared>maxBytes)throw Error("response exceeds declared body limit");
 const reader=response.body?.getReader();if(!reader){const t=await response.text();if(Buffer.byteLength(t)>maxBytes)throw Error("response exceeds body limit");return t;}
 const chunks=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw Error("response exceeds body limit");}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString("utf8");
}
for(const item of contract.checks||[]){
 if(!safePath(item.path)) {failures.push("retired API boundary path must be safe: "+item.path);continue;}
 if(item.method!=="POST") {failures.push(item.path+": method must be POST");continue;}
 if(!Array.isArray(item.expected_statuses)||!item.expected_statuses.length||!item.expected_statuses.every(n=>[404,405].includes(n)))failures.push(item.path+": only 404/405 are accepted for the retired endpoint");
 if(!Number.isInteger(item.max_body_bytes)||item.max_body_bytes<=0)failures.push(item.path+": max_body_bytes must be positive");
}
if(!failures.length){
 for(const item of contract.checks||[]){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch(new URL(item.path,contract.production_origin),{method:"POST",redirect:"manual",signal:controller.signal,headers:{"content-type":"application/json","origin":"https://invalid-phase-39h.example","user-agent":"jawed-retired-api-boundary/39H"},body:JSON.stringify(item.body||{probe:"retired-endpoint"})});
   const type=(response.headers.get("content-type")||"").toLowerCase();
   if(!item.expected_statuses.includes(response.status))failures.push(item.path+": retired endpoint should return 404/405, got "+response.status);
   if(type.includes((item.forbidden_content_type||"application/json").toLowerCase()))failures.push(item.path+": retired endpoint unexpectedly returned JSON");
   const body=await readBoundedText(response,item.max_body_bytes);
   if(/"service"\s*:\s*"jawed-ai"|"knowledge_entries"\s*:|"rate_limit"\s*:/i.test(body))failures.push(item.path+": retired server-side AI API signature detected");
  }catch(e){failures.push(item.path+": boundary probe failed: "+(e?.name==="AbortError"?"timeout":String(e)));}finally{clearTimeout(timer);}
 }
}
if(failures.length){console.error("Production retired AI API boundary validation FAILED");for(const f of failures)console.error(" - "+f);process.exitCode=1;}
else{console.log("Production retired AI API boundary validation: PASS");console.log("The obsolete /api/ai endpoint remains unavailable; no API runtime is assumed.");}
