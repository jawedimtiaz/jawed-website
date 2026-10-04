import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-404-contract.json","utf8"));
const failures=[],timeoutMs=10000;
if(contract.max_redirects!==0) failures.push("production checks must not follow redirects");
const url=new URL(contract.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
try{
 const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"accept":"text/html","user-agent":"jawed-production-404/39I"}});
 const type=(response.headers.get("content-type")||"").toLowerCase(),body=await response.text();
 if(response.status!==contract.expected_status) failures.push(`404 probe: expected HTTP ${contract.expected_status}, got ${response.status}`);
 if(!type.startsWith("text/html")) failures.push(`404 probe: expected text/html, got ${type||"missing"}`);
 if(response.status>=300&&response.status<400) failures.push("404 probe: unexpected redirect");
 for(const marker of contract.required_markers) if(!body.includes(marker)) failures.push(`404 probe: missing marker ${marker}`);
 for(const marker of contract.forbidden_markers||[]) if(body.toLowerCase().includes(marker.toLowerCase())) failures.push(`404 probe: platform/error marker detected ${marker}`);
 if(body.length<500) failures.push("404 probe: response body is unexpectedly small");
}catch(error){failures.push(`404 probe: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`)}
finally{clearTimeout(timer)}
if(failures.length){console.error("Production 404 Reliability Gate FAILED");for(const failure of failures)console.error("- "+failure);process.exit(1)}
console.log("Production 404 Reliability Gate PASSED");
console.log(`Probe: ${contract.production_origin}${contract.path}`);
