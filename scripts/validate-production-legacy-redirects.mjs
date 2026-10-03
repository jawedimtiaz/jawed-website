import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-legacy-redirect-contract.json","utf8"));
const failures=[],timeoutMs=10000;
for(const item of contract.checks){
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-redirect/38I"}});
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
