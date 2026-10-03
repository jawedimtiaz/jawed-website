import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-sitemap-contract.json","utf8"));
const failures=[],timeoutMs=10000;
const url=new URL(contract.sitemap_path,contract.production_origin);
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
try{
 const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"accept":"application/xml,text/xml","user-agent":"jawed-production-sitemap/38L"}});
 const type=(response.headers.get("content-type")||"").toLowerCase();
 const body=await response.text();
 if(response.status!==200) failures.push(`sitemap: expected HTTP 200, got ${response.status}`);
 if(!type.startsWith(contract.expected_content_type)) failures.push(`sitemap: expected content type ${contract.expected_content_type}, got ${type||"missing"}`);
 if(response.status>=300&&response.status<400) failures.push("sitemap: unexpected redirect");
 if(!body.includes("<urlset")||!body.includes("</urlset>")) failures.push("sitemap: missing urlset envelope");
 const locs=[...body.matchAll(/<loc>([^<]+)<\\/loc>/g)].map(match=>match[1].trim());
 if(!locs.length) failures.push("sitemap: no <loc> entries found");
 const unique=new Set(locs);
 if(contract.require_unique_urls&&unique.size!==locs.length) failures.push(`sitemap: duplicate URLs found (${locs.length-unique.size})`);
 for(const loc of locs){
  try{
   const parsed=new URL(loc);
   if(contract.require_absolute_urls&&!/^https:$/.test(parsed.protocol)) failures.push(`sitemap: non-HTTPS URL ${loc}`);
   if(!loc.startsWith(contract.canonical_origin+"/")) failures.push(`sitemap: non-canonical origin URL ${loc}`);
   for(const origin of contract.forbidden_origins||[]) if(loc.startsWith(origin+"/")) failures.push(`sitemap: forbidden alternate-origin URL ${loc}`);
   for(const extension of contract.forbidden_extensions||[]) if(parsed.pathname.toLowerCase().endsWith(extension)) failures.push(`sitemap: legacy extension URL ${loc}`);
   if(parsed.search||parsed.hash) failures.push(`sitemap: query/hash URL ${loc}`);
  }catch{failures.push(`sitemap: invalid absolute URL ${loc}`)}
 }
}catch(error){failures.push(`sitemap: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`)}
finally{clearTimeout(timer)}
if(failures.length){console.error("Production Sitemap Integrity Gate FAILED");for(const failure of failures)console.error("- "+failure);process.exit(1)}
console.log("Production Sitemap Integrity Gate PASSED");
console.log(`Canonical origin: ${contract.canonical_origin}`);
console.log(`URLs checked: ${[...new Set([])].length || "runtime parsed"}`);
