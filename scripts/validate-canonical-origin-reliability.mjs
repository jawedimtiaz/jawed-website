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
  if(typeof item.path!=="string"||!item.path.startsWith("/")) failures.push(`${item.path}: redirect check path must be an absolute site path`);
  if(item.max_redirects!==0) failures.push(`${item.path}: redirect check must not follow redirects`);
  if(!Array.isArray(item.expected_status)||item.expected_status.length<1||!item.expected_status.every(status=>Number.isInteger(status)&&status>=300&&status<=399)) failures.push(`${item.path}: expected redirect status contract must be a non-empty 3xx integer array`);
  if(typeof item.location!=="string"||!item.location.startsWith(contract.canonical_origin+"/")) failures.push(`${item.path}: redirect Location must target canonical origin`);
}
if(failures.length){console.error("Canonical Origin Reliability Gate FAILED");for(const f of failures) console.error("- "+f);process.exit(1);}
console.log("Canonical Origin Reliability Gate PASSED");
console.log("Redirect checks: "+contract.redirect_checks.length);
