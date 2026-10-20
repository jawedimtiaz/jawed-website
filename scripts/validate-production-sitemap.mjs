import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-sitemap-contract.json","utf8"));
const failures=[],timeoutMs=10000;
const isHttpsOrigin=value=>{try{const u=new URL(value);return typeof value==="string"&&u.protocol==="https:"&&u.origin===value&&u.username===""&&u.password===""&&u.pathname==="/"&&!u.search&&!u.hash;}catch{return false;}};
const safePath=value=>typeof value==="string"&&value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\")&&!/(^|\/)\.{1,2}(?:$|\/)/.test(value);
async function readBoundedText(response,maxBytes){
 const declared=Number(response.headers.get("content-length"));if(Number.isInteger(declared)&&declared>maxBytes)throw Error("response exceeds declared body limit");
 const reader=response.body?.getReader();if(!reader){const t=await response.text();if(Buffer.byteLength(t)>maxBytes)throw Error("response exceeds body limit");return t;}
 const chunks=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw Error("response exceeds body limit");}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString("utf8");
}
if(!isHttpsOrigin(contract.production_origin))failures.push("production sitemap origin must be origin-only HTTPS");
if(!safePath(contract.sitemap_path))failures.push("sitemap_path must be an absolute safe path");
if(contract.max_redirects!==0)failures.push("sitemap probes must not follow redirects");
if(!Number.isInteger(contract.max_body_bytes)||contract.max_body_bytes<=0)failures.push("sitemap body limit must be positive");
if(!Array.isArray(contract.forbidden_extensions))failures.push("forbidden_extensions must be an array");
if(!Array.isArray(contract.forbidden_origins))failures.push("forbidden_origins must be an array");
if(!Array.isArray(contract.route_shell_required)||!contract.route_shell_required.includes('<div id="root"></div>'))failures.push("route shell markers must include the React root");
let locations=[];
if(!failures.length){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(new URL(contract.sitemap_path,contract.production_origin),{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-sitemap/39E"}});
  const type=(response.headers.get("content-type")||"").toLowerCase();
  if(response.status!==200)failures.push("sitemap: expected HTTP 200, got "+response.status);
  if(!type.includes((contract.expected_content_type||"application/xml").toLowerCase()))failures.push("sitemap: expected "+contract.expected_content_type+", got "+type);
  const xml=await readBoundedText(response,contract.max_body_bytes);
  if(!xml.includes("<urlset")||!xml.includes("</urlset>"))failures.push("sitemap: missing urlset envelope");
  locations=[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>m[1].trim());
  if(!locations.length)failures.push("sitemap contains no <loc> URLs");
  if(contract.require_unique_urls&&new Set(locations).size!==locations.length)failures.push("sitemap contains duplicate URLs");
  for(const raw of locations){
   let url;try{url=new URL(raw)}catch{failures.push("invalid absolute sitemap URL: "+raw);continue}
   if(contract.require_absolute_urls&&!/^https:\/\//i.test(raw))failures.push("sitemap URL must be absolute HTTPS: "+raw);
   if(url.origin!==contract.canonical_origin)failures.push("sitemap URL uses non-canonical origin: "+raw);
   if((contract.forbidden_origins||[]).includes(url.origin))failures.push("sitemap URL uses forbidden origin: "+raw);
   if(url.search||url.hash)failures.push("sitemap URL must not include query or fragment: "+raw);
   if((contract.forbidden_extensions||[]).some(ext=>url.pathname.toLowerCase().endsWith(ext.toLowerCase())))failures.push("sitemap URL has forbidden extension: "+raw);
  }
 }catch(e){failures.push("sitemap request failed: "+(e?.name==="AbortError"?"timeout":e?.message||"request failed"));}finally{clearTimeout(timer)}
}
if(!failures.length){
 for(const raw of locations){
  let url;try{url=new URL(raw)}catch{continue}
  const path=url.pathname+(url.search||"");
  if(!safePath(path)){failures.push("unsafe route URL in sitemap: "+raw);continue}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetch(new URL(path,contract.production_origin),{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-sitemap/39E"}});
   const type=(response.headers.get("content-type")||"").toLowerCase();
   if(response.status!==200)failures.push(path+": expected HTTP 200, got "+response.status);
   if(!type.includes("text/html"))failures.push(path+": expected HTML app shell, got "+type);
   const body=await readBoundedText(response,contract.max_body_bytes);
   for(const marker of contract.route_shell_required||[])if(!body.includes(marker))failures.push(path+": missing SPA shell marker "+marker);
   if(!body.includes("/assets/index-"))failures.push(path+": missing hashed Vite asset reference");
  }catch(e){failures.push(path+": route request failed: "+(e?.name==="AbortError"?"timeout":e?.message||"request failed"));}finally{clearTimeout(timer)}
 }
}
if(failures.length){console.error("Production Sitemap Integrity Gate FAILED");for(const failure of failures)console.error("- "+failure);process.exit(1)}
console.log("Production Sitemap Integrity Gate PASSED");
console.log("Sitemap URLs validated:",locations.length);
console.log("Verified canonical URL policy, unique entries, and React/Vite shell availability for every sitemap URL.");
console.log("Route-specific h1/canonical metadata is tested after client rendering by browser checks, not inferred from raw HTML.");
