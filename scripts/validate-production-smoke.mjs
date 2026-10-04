import fs from "node:fs";

const contract=JSON.parse(fs.readFileSync("config/production-smoke-contract.json","utf8"));
const failures=[];
const timeoutMs=10000;
if(contract.max_redirects!==0) failures.push("production smoke checks must not follow redirects");\nfor(const item of (contract.redirect_checks||[])) if(item.max_redirects!==0) failures.push(`${item.path}: canonical redirect check must not follow redirects`);

async function check(item){
  const url=new URL(item.path,contract.production_origin);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-smoke/39I"}});
    const type=(response.headers.get("content-type")||"").toLowerCase();
    const body=await response.text();
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

for(const item of contract.checks) await check(item);

async function checkRedirect(item){
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
