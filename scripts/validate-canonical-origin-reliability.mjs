import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-smoke-contract.json","utf8"));
const failures=[];
if(!/^39I$/.test(contract.phase)) failures.push("smoke contract phase must be 39I");
if(typeof contract.canonical_origin!=="string"||!/^https:\/\//.test(contract.canonical_origin)) failures.push("canonical origin must be HTTPS");
if(typeof contract.alternate_origin!=="string"||!/^https:\/\//.test(contract.alternate_origin)) failures.push("alternate origin must be HTTPS");
if(contract.canonical_origin!=="https://jawed.co.in") failures.push("canonical origin drifted");
if(contract.alternate_origin!=="https://www.jawed.co.in") failures.push("alternate origin drifted");
if(!Array.isArray(contract.redirect_checks)||contract.redirect_checks.length<1) failures.push("at least one canonical redirect check is required");
for(const item of contract.redirect_checks||[]){
  if(typeof item.path!=="string"||!item.path.startsWith("/")||item.path.startsWith("//")||item.path.includes("\\")||/(^|\\/)\\.{1,2}(?:$|\\/)/.test(item.path)||/(^|\\/)(?:%2e){1,2}(?:$|\\/)/i.test(item.path)) failures.push(`${item.path}: redirect check path must be a safe absolute site path`);
  if(typeof item.max_redirects!=="number"||item.max_redirects!==0) failures.push(`${item.path}: redirect check max_redirects must be exactly 0`);
  if(!Array.isArray(item.expected_status)||item.expected_status.length<1||!item.expected_status.every(status=>Number.isInteger(status)&&status>=300&&status<=399)) failures.push(`${item.path}: expected redirect status contract must be a non-empty 3xx integer array`);
  if(typeof item.location!=="string"||item.location!==contract.canonical_origin+"/") failures.push(`${item.path}: redirect Location must equal canonical origin root`);
}
if(failures.length){console.error("Canonical Origin Reliability Gate FAILED");for(const f of failures) console.error("- "+f);process.exit(1);}
console.log("Canonical Origin Reliability Gate PASSED");
console.log("Redirect checks: "+contract.redirect_checks.length);
