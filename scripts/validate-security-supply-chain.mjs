import fs from "node:fs";
import path from "node:path";
const root=process.cwd(), failures=[], workflows=path.join(root,".github","workflows");
const contractPath=path.join(root,"config","security-supply-chain-contract.json");
if(!fs.existsSync(contractPath)) throw new Error("Missing Phase 38C contract");
const contract=JSON.parse(read(contractPath));
if(contract.phase!=="38C")failures.push("security supply-chain contract phase must be 38C");
if(contract.status!=="active")failures.push("security supply-chain contract must remain active");
if(contract.scope!=="repository-source-and-github-actions")failures.push("security supply-chain scope drifted");
if(typeof contract.controls!=="object"||contract.controls===null)failures.push("security supply-chain controls must be declared");

const read=f=>fs.readFileSync(f,"utf8"), fail=m=>failures.push(m);
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){if([".git","node_modules"].includes(e.name))continue;const f=path.join(dir,e.name);e.isDirectory()?out.push(...walk(f)):out.push(f)}return out}
const files=walk(root), rel=f=>path.relative(root,f).replaceAll(path.sep,"/");
const risky=/^(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|credentials?(?:\..*)?|secrets?(?:\..*)?|.*\.(?:pem|key|p12|pfx|jks|keystore))$/i;
for(const f of files){const n=rel(f);if(risky.test(path.basename(n))&&n!==".gitignore")fail("Secret-like tracked file: "+n)}
const ext=/\.(?:js|mjs|json|yml|yaml|html|css|txt|toml|conf|config)$/i, excluded=/^(?:docs\/|scripts\/validate-.*\.mjs$)/;
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,/\bgithub_pat_[A-Za-z0-9_]{20,}\b/,/\bAKIA[0-9A-Z]{16}\b/,/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,/\bAIza[0-9A-Za-z_-]{30,}\b/,/\bsk-[A-Za-z0-9_-]{20,}\b/,/\b(?:api[_-]?key|client[_-]?secret|password|private[_-]?key)\s*[:=]\s*["'][^"']{20,}["']/i,/\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._~-]{20,}/i];
for(const f of files){const n=rel(f);if(!ext.test(n)||excluded.test(n))continue;const c=read(f);for(const p of patterns)if(p.test(c))fail("Credential-like literal in "+n)}
if(!fs.existsSync(path.join(root,".gitignore")))fail("Missing .gitignore");else{const g=read(path.join(root,".gitignore")).split(/\r?\n/);for(const r of [".env*",".dev.vars*","node_modules/"])if(!g.includes(r))fail("Missing .gitignore rule: "+r)}
if(!fs.existsSync(workflows))fail("Missing .github/workflows directory");else for(const file of fs.readdirSync(workflows).filter(f=>/\.ya?ml$/i.test(f))){const n=".github/workflows/"+file,c=read(path.join(workflows,file));if(/pull_request_target\s*:|workflow_run\s*:/m.test(c))fail(n+": elevated workflow trigger is not allowed");if(/\bsecrets\.[A-Za-z_][A-Za-z0-9_]*/.test(c))fail(n+": secret access is not allowed");if(!/^permissions:\s*\n\s+contents:\s+read\s*$/m.test(c))fail(n+": permissions must explicitly be contents: read");for(const m of c.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/gm))if(!/@[0-9a-f]{40}$/i.test(m[1]))fail(n+": action not pinned to full SHA: "+m[1]);for(const m of c.matchAll(/^\s+run:\s*\|\n((?:\s{4,}.*\n?)*)/gm)){const b=m[1];if(/github\.event\.(?:pull_request|issue|comment|review)\.(?:title|body|head|ref)|github\.head_ref|github\.event\.inputs\./.test(b))fail(n+": untrusted event data in shell");if(/(?:curl|wget)\s+[^\n|]+\|\s*(?:bash|sh)\b|\beval\s+/.test(b))fail(n+": remote shell execution pattern not allowed")}}
const deps=files.filter(f=>/^(?:package\.json|package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(rel(f)));if(deps.length)fail("Unexpected dependency manifest/lockfile detected: "+deps.map(rel).join(", "));if(failures.length){console.error("Security / supply-chain validation FAILED");failures.forEach(x=>console.error(" - "+x));process.exit(1)}
console.log("Security / supply-chain validation PASSED");console.log("Workflows checked: "+fs.readdirSync(workflows).filter(f=>/\.ya?ml$/i.test(f)).length);console.log("Tracked secret-like files: 0");console.log("Dependency manifest: none");
