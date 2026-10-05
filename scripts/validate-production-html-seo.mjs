import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-html-seo-contract.json","utf8"));
const failures=[],timeoutMs=10000;
const isHttpsOrigin=value=>{try{const url=new URL(value);return typeof value==="string"&&url.protocol==="https:"&&url.origin===value&&url.username===""&&url.password===""&&url.pathname==="/"&&url.search===""&&url.hash==="";}catch{return false;}};
if(!isHttpsOrigin(contract.production_origin)) failures.push("production HTML SEO origin must be an origin-only HTTPS URL");
if(!Array.isArray(contract.checks)||contract.checks.length<1) failures.push("HTML SEO contract must contain at least one check");
for(const item of contract.checks||[]){if(typeof item.path!=="string"||!item.path.startsWith("/")||item.path.startsWith("//")||item.path.includes("\\")||/(^|\\/)\\.{1,2}(?:$|\\/)/.test(item.path)||/(^|\\/)(?:%2e){1,2}(?:$|\\/)/i.test(item.path)) failures.push("HTML SEO path must be absolute");if(typeof item.canonical!=="string") failures.push(`${item.path}: canonical must be HTTPS`); else { try { const canonical=new URL(item.canonical); const canonicalPath=canonical.pathname; const safePath=canonical.protocol==="https:"&&canonical.origin===contract.production_origin&&canonical.username===""&&canonical.password===""&&canonical.search===""&&canonical.hash===""&&canonicalPath.startsWith("/")&&!canonicalPath.startsWith("//")&&!canonicalPath.includes("\\")&&!/(^|\\/)\\.{1,2}(?:$|\\/)/.test(canonicalPath)&&!/(^|\\/)(?:%2e){1,2}(?:$|\\/)/i.test(canonicalPath); if(!safePath) failures.push(`${item.path}: canonical must be an absolute canonical-origin HTTPS URL`); } catch { failures.push(`${item.path}: canonical must be a valid HTTPS URL`); } }if(!Array.isArray(item.required)||item.required.length<1) failures.push(`${item.path}: required SEO markers must be non-empty`);}
async function readBoundedText(response,maxBytes){
 const declared=Number(response.headers.get("content-length"));
 if(Number.isInteger(declared)&&declared>maxBytes)throw new Error("response exceeds declared body limit");
 if(!response.body){const text=await response.text();if(Buffer.byteLength(text)>maxBytes)throw new Error("response exceeds body limit");return text;}
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new Error("response exceeds body limit");}chunks.push(value);}}finally{reader.releaseLock();}
 return new TextDecoder().decode(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))));
}
if(contract.max_redirects!==0) failures.push("production HTML SEO checks must not follow redirects");
if(!Number.isInteger(contract.max_body_bytes)||contract.max_body_bytes<=0) failures.push("production max_body_bytes must be a positive integer");
for(const item of contract.checks||[]){
 const validPath=typeof item.path==="string"&&item.path.startsWith("/")&&!item.path.startsWith("//")&&!item.path.includes("\\")&&!/(^|\\/)\\.{1,2}(?:$|\\/)/.test(item.path)&&!/(^|\\/)(?:%2e){1,2}(?:$|\\/)/i.test(item.path);
 const validOrigin=isHttpsOrigin(contract.production_origin);
 if(!validPath||!validOrigin){failures.push(`${item.path}: HTML SEO probe URL is invalid`);continue;}
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"accept":"text/html","user-agent":"jawed-production-html-seo/39E"}});
  const type=(response.headers.get("content-type")||"").toLowerCase(),body=await readBoundedText(response,contract.max_body_bytes);
  if(response.status!==200) failures.push(`${item.path}: expected HTTP 200, got ${response.status}`);
  if(!type.startsWith("text/html")) failures.push(`${item.path}: expected text/html, got ${type||"missing"}`);
  if(response.status>=300&&response.status<400) failures.push(`${item.path}: unexpected redirect`);
  for(const token of item.required) if(!body.includes(token)) failures.push(`${item.path}: missing required SEO marker ${token}`);
  for(const token of item.forbidden||[]) if(body.toLowerCase().includes(token.toLowerCase())) failures.push(`${item.path}: forbidden SEO marker ${token}`);
  const canonicalMatches=body.match(/<link rel="canonical" href="([^"]+)"/g)||[];
  if(canonicalMatches.length!==1) failures.push(`${item.path}: expected exactly one canonical link, found ${canonicalMatches.length}`);
  else if(!canonicalMatches[0].includes(`href="${item.canonical}"`)) failures.push(`${item.path}: canonical URL mismatch`);
  const title=(body.match(/<title>([^<]*)<\/title>/i)||[])[1]?.trim()||"";
  if(!title) failures.push(`${item.path}: empty title`);
  const description=(body.match(/<meta name="description" content="([^"]*)"/i)||[])[1]?.trim()||"";
  if(!description) failures.push(`${item.path}: empty meta description`);
 }catch(error){failures.push(`${item.path}: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`)}
 finally{clearTimeout(timer)}
}
if(failures.length){console.error("Production HTML SEO Reliability Gate FAILED");for(const failure of failures)console.error("- "+failure);process.exit(1)}
console.log("Production HTML SEO Reliability Gate PASSED");
console.log(`Representative pages checked: ${contract.checks.length}`);
