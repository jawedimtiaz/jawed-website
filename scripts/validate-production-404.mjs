import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-404-contract.json","utf8"));
const failures=[],timeoutMs=10000;
if(typeof contract.production_origin!=="string"||!/^https:\/\//.test(contract.production_origin)) failures.push("production 404 origin must be HTTPS");
if(typeof contract.path!=="string"||!contract.path.startsWith("/")||contract.path.startsWith("//")||contract.path.includes("\\")) failures.push("404 path must be absolute");
if(!Number.isInteger(contract.expected_status)||contract.expected_status<100||contract.expected_status>599) failures.push("404 expected_status must be valid");
if(!Array.isArray(contract.required_markers)||contract.required_markers.length<1) failures.push("404 required_markers must be non-empty");
async function readBoundedText(response,maxBytes){
 const declared=Number(response.headers.get("content-length"));
 if(Number.isInteger(declared)&&declared>maxBytes)throw new Error("response exceeds declared body limit");
 if(!response.body){const text=await response.text();if(Buffer.byteLength(text)>maxBytes)throw new Error("response exceeds body limit");return text;}
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new Error("response exceeds body limit");}chunks.push(value);}}finally{reader.releaseLock();}
 return new TextDecoder().decode(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))));
}
if(contract.max_redirects!==0) failures.push("production checks must not follow redirects");
if(!Number.isInteger(contract.max_body_bytes)||contract.max_body_bytes<=0) failures.push("production max_body_bytes must be a positive integer");
const url=new URL(contract.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
try{
 const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"accept":"text/html","user-agent":"jawed-production-404/39I"}});
 const type=(response.headers.get("content-type")||"").toLowerCase(),body=await readBoundedText(response,contract.max_body_bytes);
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
