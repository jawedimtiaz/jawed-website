import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-media-asset-contract.json","utf8"));
const failures=[],timeoutMs=10000;\nif(contract.max_redirects!==0) failures.push("production media asset checks must not follow redirects");
for(const item of contract.checks){
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-media/38Q"}});
  const type=(response.headers.get("content-type")||"").toLowerCase(),body=await response.arrayBuffer(),bytes=body.byteLength;
  if(response.status!==item.status) failures.push(`${item.path}: expected HTTP ${item.status}, got ${response.status}`);
  if(item.content_type&&!type.startsWith(item.content_type)) failures.push(`${item.path}: expected content type ${item.content_type}, got ${type||"missing"}`);
  if(response.status>=300&&response.status<400) failures.push(`${item.path}: unexpected redirect`);
  if(bytes<item.min_body_bytes) failures.push(`${item.path}: response is too small (${bytes} bytes)`);
  if(bytes>contract.max_body_bytes) failures.push(`${item.path}: response exceeds body limit`);
 }catch(error){failures.push(`${item.path}: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`)}
 finally{clearTimeout(timer)}
}
if(failures.length){console.error("Production Media Asset Reliability Gate FAILED");for(const f of failures)console.error("- "+f);process.exit(1)}
console.log("Production Media Asset Reliability Gate PASSED");
console.log(`Media assets checked: ${contract.checks.length}`);
