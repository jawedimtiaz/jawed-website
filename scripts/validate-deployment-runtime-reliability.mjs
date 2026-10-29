import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const exists=p=>fs.existsSync(path.join(root,p));
const fail=[];
const contract=JSON.parse(read("config/deployment-runtime-contract.json"));
const smokeContract=JSON.parse(read("config/production-smoke-contract.json"));
const isHttpsOrigin=value=>{if(typeof value!=="string"||!/^https:\/\//.test(value))return false;try{const url=new URL(value);return url.protocol==="https:"&&url.origin===value&&url.username===""&&url.password===""&&url.pathname==="/"&&url.search===""&&url.hash==="";}catch{return false;}};

if(contract.production_origin!==smokeContract.production_origin)fail.push("deployment and smoke production_origin values drifted");
if(contract.alternate_origin!==smokeContract.alternate_origin)fail.push("deployment and smoke alternate_origin values drifted");
if(!isHttpsOrigin(contract.production_origin))fail.push("production_origin must be an origin-only HTTPS URL");
if(!isHttpsOrigin(contract.alternate_origin))fail.push("alternate_origin must be an origin-only HTTPS URL");
if(contract.deployment_model!=="cloudflare-pages")fail.push("deployment_model must remain cloudflare-pages");
if(contract.build_command!=="npm run build")fail.push("build_command must match the Vite app build");
if(contract.build_output_directory!=="dist")fail.push("build_output_directory must be dist");
if(!Array.isArray(contract.required_runtime_files)||!contract.required_runtime_files.length)fail.push("required_runtime_files must be declared");
for(const p of contract.required_runtime_files||[]){
 if(typeof p!=="string"||!p.trim()||path.isAbsolute(p)||p.split("/").includes("..")){fail.push("required runtime path is unsafe: "+p);continue;}
 if(!exists(p))fail.push("missing required runtime file: "+p);
 else if(!fs.statSync(path.join(root,p)).isFile())fail.push("required runtime path is not a file: "+p);
}

let pkg={};
try{pkg=JSON.parse(read("package.json"));if(!pkg.name||!pkg.scripts||pkg.scripts.build!== "tsc && vite build")fail.push("package.json must declare the expected Vite build script");}
catch{fail.push("package.json must be valid JSON");}

const headers=exists("public/_headers")?read("public/_headers"):"";
const rootHeaders=exists("_headers")?read("_headers"):"";
for(const required of contract.required_security_headers||[]){
 if(!headers.includes(required))fail.push("public/_headers missing required security header: "+required);
 if(rootHeaders&&!rootHeaders.includes(required))fail.push("root _headers missing required baseline: "+required);
}

const rootRedirects=exists("_redirects")?read("_redirects"):"";
const publicRedirects=exists("public/_redirects")?read("public/_redirects"):"";
const publicLines=new Set(publicRedirects.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#")));
for(const line of rootRedirects.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#"))){
 if(!publicLines.has(line))fail.push("public/_redirects is missing legacy redirect: "+line);
}
for(const line of contract.spa_route_rewrites||[]){
 if(!publicLines.has(line))fail.push("public/_redirects is missing SPA route rewrite: "+line);
 const parts=line.split(/\s+/);
 if(parts.length!==3||parts[1]!=="/"||Number(parts[2])!==200)fail.push("SPA route rewrite must safely rewrite to / with status 200: "+line);
 const prefix=parts[0].replace(/\/\*$/,"").replace(/\/$/,"");
 if(prefix&&!read("src/App.tsx").includes('path="'+prefix))fail.push("SPA rewrite has no matching React Router path: "+prefix);
}
for(const line of publicRedirects.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#"))){
 const parts=line.split(/\s+/);
 if(parts.length>=3&&!((contract.allowed_redirect_statuses||[]).includes(Number(parts.at(-1)))))fail.push("unexpected redirect status: "+line);
 if(parts[1]==="/index.html"&&Number(parts.at(-1))===200)fail.push("SPA rewrites must not target /index.html because the legacy redirect strips that path: "+line);
}

const index=read("index.html");
if(contract.canonical_origin_must_be_exact&&!index.includes('<link rel="canonical" href="'+contract.production_origin+'/"'))fail.push("index canonical origin must match production origin");
const sitemap=read("public/sitemap.xml");
if(!sitemap.includes(contract.production_origin))fail.push("public sitemap must use production origin");
if(sitemap.includes(contract.alternate_origin))fail.push("public sitemap must not contain alternate origin");
const robots=read("public/robots.txt");
if(!robots.includes("Allow: /"))fail.push("public robots.txt must allow public crawling");
if(!robots.includes("Sitemap: "+contract.production_origin+"/sitemap.xml"))fail.push("public robots.txt must declare the canonical sitemap");
const app=read("src/App.tsx");
const ai=read("src/services/aiKnowledgeEngine.ts");
if(contract.ai_runtime!=="client-side-knowledge-search")fail.push("AI runtime contract must explicitly describe the client-side architecture");
if(!app.includes('path="/ai/*"')||!ai.includes("export async function askJawedAi"))fail.push("client-side AI route or knowledge-search entry point is missing");
const declaredApiRoutes=contract.api_routes||[];
if(!Array.isArray(declaredApiRoutes)||declaredApiRoutes.length!==0)fail.push("local-first audio transcription must not declare server API routes");
if(exists("functions/api/transcribe.ts"))fail.push("billable server-side transcription Function must not be deployed");


if(fail.length){console.error("Deployment Runtime Reliability Gate FAILED");for(const item of fail)console.error("- "+item);process.exit(1);}
console.log("Deployment Runtime Reliability Gate PASSED");
console.log("Build: "+contract.build_command+" -> "+contract.build_output_directory);
console.log("Runtime: Vite/React Router SPA");
console.log("Pages headers, legacy redirects, SPA rewrites, sitemap, robots, client-side knowledge AI and local-first audio transcription contracts: validated");
