import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-ai-get-contract.json","utf8"));
const failures=[];
const safeOrigin=value=>{try{const u=new URL(value);return typeof value==="string"&&u.protocol==="https:"&&u.origin===value&&u.username===""&&u.password===""&&u.pathname==="/"&&!u.search&&!u.hash;}catch{return false;}};
const safePath=value=>typeof value==="string"&&value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\")&&!/(^|\/)\.{1,2}(?:$|\/)/.test(value);
if(!safeOrigin(contract.production_origin))failures.push("AI frontend probe origin must be an origin-only HTTPS URL");
if(!safePath(contract.path))failures.push("AI frontend route must be an absolute safe path");
if(contract.method!=="GET")failures.push("AI frontend route probe must use GET");
if(!Number.isInteger(contract.expected_status)||contract.expected_status<200||contract.expected_status>299)failures.push("AI frontend route expected status must be 2xx");
if(typeof contract.expected_content_type!=="string"||!contract.expected_content_type.includes("text/html"))failures.push("AI frontend route must expect HTML");
if(!Array.isArray(contract.required_markers)||contract.required_markers.length<1)failures.push("AI frontend route markers are required");
if(contract.max_redirects!==0)failures.push("AI frontend probe must not follow redirects");
if(!Number.isInteger(contract.max_body_bytes)||contract.max_body_bytes<=0)failures.push("AI frontend body limit must be positive");
async function readBoundedText(response,maxBytes){
 const declared=Number(response.headers.get("content-length"));if(Number.isInteger(declared)&&declared>maxBytes)throw Error("response exceeds declared body limit");
 const reader=response.body?.getReader();if(!reader){const t=await response.text();if(Buffer.byteLength(t)>maxBytes)throw Error("response exceeds body limit");return t;}
 const chunks=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw Error("response exceeds body limit");}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString("utf8");
}
if(!failures.length){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(new URL(contract.path,contract.production_origin),{method:"GET",redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-ai-route/39H"}});
  const type=response.headers.get("content-type")||"";
  if(response.status!==contract.expected_status)failures.push("AI frontend route: expected HTTP "+contract.expected_status+", got "+response.status);
  if(!type.toLowerCase().includes(contract.expected_content_type))failures.push("AI frontend route: expected "+contract.expected_content_type+", got "+type);
  const body=await readBoundedText(response,contract.max_body_bytes);
  for(const marker of contract.required_markers||[])if(!body.includes(marker))failures.push("AI frontend route is missing shell marker: "+marker);
  if(body.includes("jawed-ai")||body.includes('"knowledge_entries"'))failures.push("AI frontend route unexpectedly resembles the retired server API");
 }catch(e){failures.push("AI frontend route probe failed: "+(e?.name==="AbortError"?"timeout":String(e)));}finally{clearTimeout(timer);}
}
if(failures.length){console.error("Production AI frontend route validation FAILED");for(const f of failures)console.error(" - "+f);process.exitCode=1;}
else{console.log("Production AI frontend route validation: PASS");console.log("Verified the /ai/ React shell; no server-side AI API is assumed.");}
