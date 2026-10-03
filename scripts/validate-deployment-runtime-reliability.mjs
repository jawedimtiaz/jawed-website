import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const contract=JSON.parse(read("config/deployment-runtime-contract.json"));
const fail=[];

const exists=p=>fs.existsSync(path.join(root,p));
for(const p of contract.required_runtime_files) if(!exists(p)) fail.push(`missing required runtime file: ${p}`);
if(!exists(contract.functions_directory)) fail.push(`missing functions directory: ${contract.functions_directory}`);

const headers=read("_headers");
if(!headers.includes("Strict-Transport-Security:")) fail.push("production headers missing HSTS");
if(!headers.includes("Content-Security-Policy:")) fail.push("production headers missing CSP");

const routes=JSON.parse(read("_routes.json"));
if(routes.version!==1) fail.push("_routes.json version must remain 1");
if(!Array.isArray(routes.include)||!routes.include.includes("/api/*")) fail.push("_routes.json must include /api/*");
if(routes.exclude?.length) fail.push("_routes.json must not exclude API routes");

const redirects=read("_redirects");
for(const line of redirects.split(/\\r?\\n/).filter(Boolean)){
  const parts=line.trim().split(/\\s+/);
  if(parts.length>=3 && parts[2]!=="200" && !/^30[1278]$/.test(parts[2])) fail.push(`unexpected redirect status: ${line}`);
}

const index=read("index.html");
if(!index.includes(`<link rel="canonical" href="${contract.production_origin}/"`)) fail.push("index canonical origin must be www production origin");
if(index.includes("https://jawed.co.in/") && !index.includes(contract.legacy_origin)) fail.push("index contains unexpected legacy-origin handling");

const sitemap=read("sitemap.xml");
if(!sitemap.includes(contract.production_origin)) fail.push("sitemap must use the production www origin");
if(/<loc>https:\/\/jawed\.co\.in\//.test(sitemap)) fail.push("sitemap must not publish legacy non-www URLs");

const ai=read("functions/api/ai.js");
if(!ai.includes('origin==="https://www.jawed.co.in"')) fail.push("AI API must allow canonical www origin");
if(!ai.includes('origin==="https://jawed.co.in"')) fail.push("AI API must retain legacy origin compatibility");

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
