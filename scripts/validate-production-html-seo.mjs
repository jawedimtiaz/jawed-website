import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-html-seo-contract.json","utf8"));
const failures=[],timeoutMs=10000;
for(const item of contract.checks){
 const url=new URL(item.path,contract.production_origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"accept":"text/html","user-agent":"jawed-production-html-seo/39E"}});
  const type=(response.headers.get("content-type")||"").toLowerCase(),body=await response.text();
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
