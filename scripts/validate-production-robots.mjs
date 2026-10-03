import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-robots-contract.json","utf8"));
const failures=[],timeoutMs=10000;
for(const item of contract.checks){
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-robots/38K"}});
  const type=(response.headers.get("content-type")||"").toLowerCase();
  const body=await response.text();
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
