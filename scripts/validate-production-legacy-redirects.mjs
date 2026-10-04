import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-legacy-redirect-contract.json","utf8"));
const failures=[],timeoutMs=10000;
const configured=fs.readFileSync("_redirects","utf8").split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#")).filter(line=>line.endsWith(" 301")).map(line=>{const parts=line.split(/\s+/);return {path:parts[0],location:parts[1],status:Number(parts[2])}});
const configuredMap=new Map(configured.map(item=>[item.path,item]));
for(const item of contract.checks){\n const local=configuredMap.get(item.path);\n if(!local) failures.push(item.path+": missing from _redirects");\n else if(local.status!==item.expected_status||local.location!==item.location) failures.push(item.path+": _redirects disagrees with contract");\n}\nconst contractedPaths=new Set(contract.checks.map(item=>item.path));\nfor(const item of configured) if(!contractedPaths.has(item.path)) failures.push(item.path+": _redirects entry missing from legacy redirect contract");\n\nfor(const item of contract.checks){
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
