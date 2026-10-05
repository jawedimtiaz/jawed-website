import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-legacy-redirect-contract.json","utf8"));
const failures=[],timeoutMs=10000;if(typeof contract.production_origin!=="string"||!/^https:\/\//.test(contract.production_origin)) failures.push("legacy redirect production origin must be HTTPS");

if(contract.max_redirects!==0) failures.push("legacy redirect checks must not follow redirects");
if(!Array.isArray(contract.checks)||contract.checks.length<1) failures.push("legacy redirect contract must contain at least one check");
for(const item of contract.checks||[]){
 if(typeof item.path!=="string"||!item.path.startsWith("/")||item.path.startsWith("//")||item.path.includes("\\")||/(^|\\/)\\.{1,2}(?:$|\\/)/.test(item.path)||/(^|\\/)(?:%2e){1,2}(?:$|\\/)/i.test(item.path)) failures.push("legacy redirect path must be an absolute site path");
 if(!Number.isInteger(item.expected_status)||item.expected_status<300||item.expected_status>399) failures.push(item.path+": expected_status must be a redirect status");
 if(typeof item.location!=="string"||(!item.location.startsWith("/")&&!item.location.startsWith("https://"))) failures.push(item.path+": redirect location must be a path or HTTPS URL");
}
for(const item of (contract.checks||[])) if(item.max_redirects!==0) failures.push(`${item.path}: legacy redirect check must not follow redirects`);
const configured=fs.readFileSync("_redirects","utf8").split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#")).filter(line=>{const parts=line.split(/\s+/);return parts.length>=3&&/^30[1278]$/.test(parts.at(-1))}).map(line=>{const parts=line.split(/\s+/);return {path:parts[0],location:parts[1],status:Number(parts.at(-1))}});
const configuredMap=new Map(configured.map(item=>[item.path,item]));
for(const item of (contract.checks||[])){
 const local=configuredMap.get(item.path);
 if(!local) failures.push(item.path+": missing from _redirects");
 else if(local.status!==item.expected_status||local.location!==item.location) failures.push(item.path+": _redirects disagrees with contract");
}
const contractedPaths=new Set(contract.checks.map(item=>item.path));
for(const item of configured) if(!contractedPaths.has(item.path)) failures.push(item.path+": _redirects entry missing from legacy redirect contract");

for(const item of contract.checks||[]){
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-redirect/39I"}});
  const location=response.headers.get("location")||"";
  if(response.status!==item.expected_status) failures.push(`${item.path}: expected HTTP ${item.expected_status}, got ${response.status}`);
  if(location!==item.location) failures.push(`${item.path}: expected Location ${item.location}, got ${location||"missing"}`);
 }catch(error){failures.push(`${item.path}: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`)}
 finally{clearTimeout(timer)}
}
if(failures.length){console.error("Production Legacy Redirect Gate FAILED");for(const failure of failures)console.error("- "+failure);process.exit(1)}
console.log("Production Legacy Redirect Gate PASSED");
console.log(`Origin: ${contract.production_origin}`);
console.log(`Legacy redirects checked: ${contract.checks.length}`);
