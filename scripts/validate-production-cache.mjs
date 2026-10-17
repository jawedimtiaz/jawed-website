import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-cache-contract.json","utf8"));
const failures=[],timeoutMs=10000;
const isHttpsOrigin=value=>{try{const url=new URL(value);return typeof value==="string"&&url.protocol==="https:"&&url.origin===value&&url.username===""&&url.password===""&&url.pathname==="/"&&url.search===""&&url.hash==="";}catch{return false;}};
if(!isHttpsOrigin(contract.production_origin)) failures.push("cache production_origin must be an origin-only HTTPS URL");

if(contract.max_redirects!==0) failures.push("production cache checks must not follow redirects");
if(!Array.isArray(contract.checks)||contract.checks.length<1) failures.push("production cache contract must contain at least one check");
for(const item of contract.checks||[]){
if(typeof item.path!=="string"||!item.path.startsWith("/")||item.path.startsWith("//")||item.path.includes("\\")||/(^|\/)\.{1,2}(?:$|\/)/.test(item.path)||/(^|\/)(?:%2e){1,2}(?:$|\/)/i.test(item.path)) failures.push("cache check path must be an absolute site path");
 if(typeof item.require_cache_control!=="boolean") failures.push(item.path+": require_cache_control must be boolean");
 if(!["public","no-store"].includes(item.cache_policy)) failures.push(item.path+": cache_policy must be public or no-store");
}
for(const item of (contract.checks||[])){
 const validOrigin=isHttpsOrigin(contract.production_origin);
 const validPath=typeof item.path==="string"&&item.path.startsWith("/")&&!item.path.startsWith("//")&&!item.path.includes("\\")&&!/(^|\/)\.{1,2}(?:$|\/)/.test(item.path)&&!/(^|\/)(?:%2e){1,2}(?:$|\/)/i.test(item.path);
 if(!validPath||!validOrigin){failures.push(`${item.path}: cache probe URL is invalid`);continue;}
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-cache/38R"}});
  if(response.status!==200) failures.push(`${item.path}: expected HTTP 200, got ${response.status}`);
  const cache=(response.headers.get("cache-control")||"").toLowerCase();
  if(response.status>=300&&response.status<400) failures.push(`${item.path}: unexpected redirect`);
  if(item.require_cache_control&&!cache) failures.push(`${item.path}: missing Cache-Control header`);
  if(!["public","no-store"].includes(item.cache_policy)) failures.push(`${item.path}: unsupported cache policy ${item.cache_policy}`);
  if(item.cache_policy==="public"&&!cache.includes("public")) failures.push(`${item.path}: expected public cache policy, got ${cache||"missing"}`);
  if(item.cache_policy==="no-store"&&!cache.includes("no-store")) failures.push(`${item.path}: expected no-store cache policy, got ${cache||"missing"}`);
 }catch(error){failures.push(`${item.path}: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`)}
 finally{clearTimeout(timer)}
}
if(failures.length){console.error("Production Cache Reliability Gate FAILED");for(const f of failures)console.error("- "+f);process.exit(1)}
console.log("Production Cache Reliability Gate PASSED");
console.log(`Cache-policy checks: ${contract.checks.length}`);
