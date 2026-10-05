import fs from "node:fs";

const contract=JSON.parse(fs.readFileSync("config/production-smoke-contract.json","utf8"));
const failures=[];
const timeoutMs=10000;
const isHttpsOrigin=value=>{if(typeof value!=="string"||!/^https:\/\//.test(value))return false;try{const url=new URL(value);return url.protocol==="https:"&&url.origin===value&&url.username===""&&url.password===""&&url.pathname==="/"&&url.search===""&&url.hash==="";}catch{return false;}};
if(!isHttpsOrigin(contract.production_origin)) failures.push("production smoke origin must be an origin-only HTTPS URL");
if(!isHttpsOrigin(contract.canonical_origin)) failures.push("production smoke canonical_origin must be an origin-only HTTPS URL");
if(!isHttpsOrigin(contract.alternate_origin)) failures.push("production smoke alternate_origin must be an origin-only HTTPS URL");
if(contract.canonical_origin!==contract.production_origin) failures.push("production smoke canonical_origin must match production_origin");
if(!Array.isArray(contract.checks)||contract.checks.length<1) failures.push("production smoke contract must contain at least one check");
if(!Array.isArray(contract.redirect_checks)||contract.redirect_checks.length<1) failures.push("production smoke contract must contain at least one redirect check");
if(contract.max_redirects!==0) failures.push("production smoke checks must not follow redirects");
if(!Number.isInteger(contract.max_body_bytes)||contract.max_body_bytes<=0) failures.push("production smoke max_body_bytes must be a positive integer");
for(const item of contract.checks||[]){
 if(typeof item.path!=="string"||!item.path.startsWith("/")||item.path.startsWith("//")||item.path.includes("\\")||/(^|\\/)\\.{1,2}(?:$|\\/)/.test(item.path)||/(^|\\/)(?:%2e){1,2}(?:$|\\/)/i.test(item.path)) failures.push("smoke check path must be an absolute site path");
 if(!Number.isInteger(item.status)||item.status<100||item.status>599) failures.push(`${item.path}: status must be a valid HTTP status`);
 if(typeof item.content_type!=="string"||!item.content_type.trim()) failures.push(`${item.path}: content_type must be non-empty`);
 if(item.required_markers!==undefined&&(!Array.isArray(item.required_markers)||item.required_markers.some(marker=>typeof marker!=="string"||!marker))) failures.push(`${item.path}: required_markers must be non-empty strings`);
}
for(const item of (contract.redirect_checks||[])){
 if(typeof item.path!=="string"||!item.path.startsWith("/")||item.path.startsWith("//")||item.path.includes("\\")||/(^|\\/)\\.{1,2}(?:$|\\/)/.test(item.path)||/(^|\\/)(?:%2e){1,2}(?:$|\\/)/i.test(item.path)) failures.push("redirect check path must be an absolute site path");
 if(!Array.isArray(item.expected_status)||item.expected_status.length<1||!item.expected_status.every(status=>Number.isInteger(status)&&status>=300&&status<=399)) failures.push(`${item.path||"<unknown>"}: redirect expected_status must be a non-empty 3xx integer array`);
 if(typeof item.location!=="string"||item.location!==contract.canonical_origin+"/") failures.push(`${item.path||"<unknown>"}: redirect location must equal canonical origin root`);
 if(item.max_redirects!==0) failures.push(`${item.path||"<unknown>"}: canonical redirect check must not follow redirects`);
}

async function readBoundedText(response,maxBytes){
  const declared=Number(response.headers.get("content-length"));
  if(Number.isInteger(declared)&&declared>maxBytes)throw new Error("response exceeds declared smoke-test body limit");
  if(!response.body){
    const text=await response.text();
    if(Buffer.byteLength(text)>maxBytes)throw new Error("response exceeds smoke-test body limit");
    return text;
  }
  const reader=response.body.getReader();
  const chunks=[];
  let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>maxBytes){
        await reader.cancel();
        throw new Error("response exceeds smoke-test body limit");
      }
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  return new TextDecoder().decode(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))));
}

async function check(item){
  const validPath=typeof item.path==="string"&&item.path.startsWith("/")&&!item.path.startsWith("//")&&!item.path.includes("\\")&&!/(^|\\/)\\.{1,2}(?:$|\\/)/.test(item.path)&&!/(^|\\/)(?:%2e){1,2}(?:$|\\/)/i.test(item.path);
  const validOrigin=isHttpsOrigin(contract.production_origin);
  if(!validPath||!validOrigin){failures.push(item.path+": smoke probe URL is invalid");return;}
  const url=new URL(item.path,contract.production_origin);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-smoke/39I"}});
    const type=(response.headers.get("content-type")||"").toLowerCase();
    const body=await readBoundedText(response,contract.max_body_bytes);
    if(response.status!==item.status) failures.push(`${item.path}: expected HTTP ${item.status}, got ${response.status}`);
    if(item.content_type&&!type.startsWith(item.content_type)) failures.push(`${item.path}: expected content type ${item.content_type}, got ${type||"missing"}`);
    if(response.status>=300&&response.status<400) failures.push(`${item.path}: unexpected redirect during smoke test`);
    if(Buffer.byteLength(body)>contract.max_body_bytes) failures.push(`${item.path}: response exceeds smoke-test body limit`);
    if(item.path==="/api/ai"){
      let json;
      try{json=JSON.parse(body)}catch{failures.push("/api/ai: response is not valid JSON");return;}
      if(json.service!=="jawed-ai") failures.push("/api/ai: missing expected service identifier");
      if(typeof json.status!=="string") failures.push("/api/ai: missing readiness status");
      if(typeof json.model!=="string"||!json.model) failures.push("/api/ai: missing model metadata");
    }
    if(item.path.includes("?q=automation")&&!response.url.includes("?q=automation")) failures.push("/notes/?q=automation: query parameter was not preserved");
    for(const marker of (item.required_markers||[])) if(!body.includes(marker)) failures.push(`${item.path}: missing required smoke marker ${marker}`);
  }catch(error){
    failures.push(`${item.path}: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`);
  }finally{clearTimeout(timer);}
}

for(const item of contract.checks||[]) await check(item);

async function checkRedirect(item){
  const validPath=typeof item.path==="string"&&item.path.startsWith("/")&&!item.path.startsWith("//")&&!item.path.includes("\\")&&!/(^|\\/)\\.{1,2}(?:$|\\/)/.test(item.path)&&!/(^|\\/)(?:%2e){1,2}(?:$|\\/)/i.test(item.path);
  const validOrigin=isHttpsOrigin(contract.alternate_origin);
  if(!validPath||!validOrigin){failures.push(item.path+": alternate-origin redirect URL is invalid");return;}
  const url=new URL(item.path,contract.alternate_origin);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-smoke/39I"}});
    const location=response.headers.get("location")||"";
    if(!item.expected_status.includes(response.status)) failures.push(`${item.path}: alternate origin expected redirect status ${item.expected_status.join(" or ")}, got ${response.status}`);
    if(location!==item.location) failures.push(`${item.path}: alternate origin expected Location ${item.location}, got ${location||"missing"}`);
  }catch(error){
    failures.push(`${item.path}: alternate-origin redirect check failed: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`);
  }finally{clearTimeout(timer);}
}

for(const item of (contract.redirect_checks||[])) await checkRedirect(item);

if(failures.length){
  console.error("Production Smoke Reliability Gate FAILED");
  for(const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Production Smoke Reliability Gate PASSED");
console.log(`Origin: ${contract.production_origin}`);
console.log(`Checks: ${contract.checks.length}`);
console.log(`Canonical redirect checks: ${(contract.redirect_checks||[]).length}`);
