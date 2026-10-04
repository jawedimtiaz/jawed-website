import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const contract=JSON.parse(read("config/deployment-runtime-contract.json"));
const fail=[];

const exists=p=>fs.existsSync(path.join(root,p));
for(const p of contract.required_runtime_files) if(!exists(p)) fail.push(`missing required runtime file: ${p}`);
if(!exists(contract.functions_directory)) fail.push(`missing functions directory: ${contract.functions_directory}`);
else if(!fs.statSync(path.join(root,contract.functions_directory)).isDirectory()) fail.push(`functions_directory is not a directory: ${contract.functions_directory}`);

const headers=read("_headers");
for(const required of (contract.required_security_headers||[])) if(!headers.includes(required)) fail.push(`production headers missing required baseline: ${required}`);

const routes=JSON.parse(read("_routes.json"));
const routeContract=contract.required_route_configuration||{};
if(routes.version!==routeContract.version) fail.push("_routes.json version drifted from deployment contract");
if(JSON.stringify(routes.include)!==JSON.stringify(routeContract.include)) fail.push("_routes.json include rules drifted from deployment contract");
if(JSON.stringify(routes.exclude||[])!==JSON.stringify(routeContract.exclude||[])) fail.push("_routes.json exclude rules drifted from deployment contract");
for(const apiRoute of (contract.api_routes||[])) if(!(routes.include||[]).some(rule=>rule==="/*"||rule===apiRoute||rule===apiRoute+"/*"||rule.endsWith("*")&&apiRoute.startsWith(rule.slice(0,-1)))) fail.push(`declared API route is not covered by _routes.json include rules: ${apiRoute}`);

const redirects=read("_redirects");
for(const line of redirects.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#"))){
  const parts=line.trim().split(/\s+/);
  if(parts.length>=3 && parts[2]!=="200" && !/^30[1278]$/.test(parts[2])) fail.push(`unexpected redirect status: ${line}`);
}

const index=read("index.html");
if(!index.includes(`<link rel="canonical" href="${contract.production_origin}/"`)) fail.push("index canonical origin must match production origin");

const sitemap=read("sitemap.xml");
if(!sitemap.includes(contract.production_origin)) fail.push("sitemap must use the production origin");
if(sitemap.includes(contract.alternate_origin)) fail.push("sitemap must not contain the alternate origin");

const ai=read("functions/api/ai.js");

if(!ai.includes(`origin==="${contract.production_origin}"`)) fail.push("AI API must allow the production origin");

if(contract.no_package_manifest_required){
  for(const p of ["package.json","package-lock.json","pnpm-lock.yaml","yarn.lock"]) if(exists(p)) fail.push(`unexpected package/dependency manifest: ${p}`);
}
if(!contract.build_command && !contract.external_deployment_provider) fail.push("deployment contract must identify external deployment provider");

if(fail.length){
  console.error("Deployment Runtime Reliability Gate FAILED");
  for(const item of fail) console.error("- "+item);
  process.exit(1);
}
console.log("Deployment Runtime Reliability Gate PASSED");
console.log(`Production origin: ${contract.production_origin}`);
console.log(`Deployment model: ${contract.deployment_model}`);
console.log(`Functions directory: ${contract.functions_directory}`);
console.log(`API boundary: ${routes.include.join(", ")}`);
