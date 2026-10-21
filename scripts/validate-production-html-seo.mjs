import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-html-seo-contract.json","utf8"));
const failures=[],timeoutMs=10000;
const isHttpsOrigin=value=>{try{const u=new URL(value);return typeof value==="string"&&u.protocol==="https:"&&u.origin===value&&u.username===""&&u.password===""&&u.pathname==="/"&&!u.search&&!u.hash;}catch{return false;}};
const safePath=value=>typeof value==="string"&&value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\")&&!/(^|\/)\.{1,2}(?:$|\/)/.test(value);
if(!isHttpsOrigin(contract.production_origin))failures.push("production HTML SEO origin must be origin-only HTTPS");
if(contract.max_redirects!==0)failures.push("production HTML SEO probes must not follow redirects");
if(!Number.isInteger(contract.max_body_bytes)||contract.max_body_bytes<=0)failures.push("production HTML SEO body limit must be positive");
if(!contract.root_check||!safePath(contract.root_check.path)||contract.root_check.path!=="/")failures.push("root_check must target /");
if(typeof contract.root_check?.canonical!=="string"||!contract.root_check.canonical.startsWith(contract.production_origin+"/"))failures.push("root canonical must use the production origin");
if(!Array.isArray(contract.root_check?.required)||!contract.root_check.required.length)failures.push("root SEO markers are required");
if(!Array.isArray(contract.route_shells)||!contract.route_shells.length)failures.push("SPA route-shell checks are required");
if(!Array.isArray(contract.route_shell_required)||!contract.route_shell_required.includes('<div id="root"></div>'))failures.push("route-shell markers must include the React root");
async function readBoundedText(response,maxBytes){
 const declared=Number(response.headers.get("content-length"));if(Number.isInteger(declared)&&declared>maxBytes)throw Error("response exceeds declared body limit");
 const reader=response.body?.getReader();if(!reader){const t=await response.text();if(Buffer.byteLength(t)>maxBytes)throw Error("response exceeds body limit");return t;}
 const chunks=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw Error("response exceeds body limit");}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString("utf8");
}
async function get(path,label){
 if(!safePath(path)){failures.push(label+": unsafe route path");return "";}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(new URL(path,contract.production_origin),{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-seo-shell/39E"}});
  const type=response.headers.get("content-type")||"";
  if(response.status!==200)failures.push(label+": expected HTTP 200, got "+response.status);
  if(!type.toLowerCase().includes("text/html"))failures.push(label+": expected HTML, got "+type);
  return await readBoundedText(response,contract.max_body_bytes);
 }catch(e){failures.push(label+": request failed: "+(e?.name==="AbortError"?"timeout":String(e)));return "";}finally{clearTimeout(timer);}
}
function normalizeHtmlForMarkerChecks(html){
 return html.replace(/\\s+/g," ").replace(/\\s+\\/>/g,">").trim();
}
if(!failures.length){
 const root=await get(contract.root_check.path,"homepage SEO shell");
 const normalizedRoot=normalizeHtmlForMarkerChecks(root);
 for(const marker of contract.root_check.required||[])if(!normalizedRoot.includes(normalizeHtmlForMarkerChecks(marker)))failures.push("homepage SEO shell missing marker: "+marker);
 for(const marker of contract.root_check.forbidden||[])if(normalizedRoot.toLowerCase().includes(normalizeHtmlForMarkerChecks(marker).toLowerCase()))failures.push("homepage SEO shell contains forbidden marker: "+marker);
 if(!normalizedRoot.includes(normalizeHtmlForMarkerChecks(contract.root_check.canonical)))failures.push("homepage canonical URL mismatch");
 for(const path of contract.route_shells||[]){
  const body=await get(path,"SPA route "+path);
  for(const marker of contract.route_shell_required||[])if(!body.includes(marker))failures.push(path+": missing React SPA shell marker "+marker);
 }
}
if(failures.length){console.error("Production HTML SEO shell validation FAILED");for(const f of failures)console.error(" - "+f);process.exitCode=1;}
else{console.log("Production HTML SEO shell validation: PASS");console.log("Homepage raw HTML metadata and "+contract.route_shells.length+" SPA route shells verified.");console.log("Route-specific canonical/title/description updates are client-side and are tested by the local browser runtime gate, not inferred from raw HTTP HTML.");}
