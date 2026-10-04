import fs from "node:fs";
const contract=JSON.parse(fs.readFileSync("config/production-smoke-contract.json","utf8"));
const failures=[];
if(!/^39A$/.test(contract.phase)) failures.push("smoke contract phase must be 39A");
if(contract.canonical_origin!=="https://jawed.co.in") failures.push("canonical origin drifted");
if(contract.alternate_origin!=="https://www.jawed.co.in") failures.push("alternate origin drifted");
if(!Array.isArray(contract.redirect_checks)||contract.redirect_checks.length<1) failures.push("at least one canonical redirect check is required");
for(const item of contract.redirect_checks||[]){
  if(item.max_redirects!==0) failures.push(`${item.path}: redirect check must not follow redirects`);
  if(!Array.isArray(item.expected_status)||!item.expected_status.every(Number.isInteger)) failures.push(`${item.path}: expected redirect status contract is invalid`);
  if(typeof item.location!=="string"||!item.location.startsWith(contract.canonical_origin+"/")) failures.push(`${item.path}: redirect Location must target canonical origin`);
}
if(failures.length){console.error("Canonical Origin Reliability Gate FAILED");for(const f of failures) console.error("- "+f);process.exit(1);}
console.log("Canonical Origin Reliability Gate PASSED");
console.log("Redirect checks: "+contract.redirect_checks.length);
