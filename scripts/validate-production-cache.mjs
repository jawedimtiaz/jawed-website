import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-cache-contract.json","utf8"));
const failures=[],timeoutMs=10000;
for(const item of contract.checks){
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-cache/38R"}});
  if(response.status!==200) failures.push(`${item.path}: expected HTTP 200, got ${response.status}`);
  const cache=(response.headers.get("cache-control")||"").toLowerCase();
  if(response.status>=300&&response.status<400) failures.push(`${item.path}: unexpected redirect`);
  if(item.require_cache_control&&!cache) failures.push(`${item.path}: missing Cache-Control header`);
  if(item.cache_policy==="public"&&!cache.includes("public")) failures.push(`${item.path}: expected public cache policy, got ${cache||"missing"}`);
  if(item.cache_policy==="no-store"&&!cache.includes("no-store")) failures.push(`${item.path}: expected no-store cache policy, got ${cache||"missing"}`);
 }catch(error){failures.push(`${item.path}: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`)}
 finally{clearTimeout(timer)}
}
if(failures.length){console.error("Production Cache Reliability Gate FAILED");for(const f of failures)console.error("- "+f);process.exit(1)}
console.log("Production Cache Reliability Gate PASSED");
console.log(`Cache-policy checks: ${contract.checks.length}`);
