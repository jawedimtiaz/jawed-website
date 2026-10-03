import fs from "node:fs";

const contract=JSON.parse(fs.readFileSync("config/production-monitoring-contract.json","utf8"));
const workflow=fs.readFileSync(contract.production_smoke_workflow,"utf8");
const smoke=JSON.parse(fs.readFileSync("config/production-smoke-contract.json","utf8"));
const failures=[];

if(contract.phase!=="38F") failures.push("contract phase must be 38F");
if(contract.monitoring_mode!=="scheduled-github-actions") failures.push("monitoring mode must remain scheduled GitHub Actions");
if(contract.cadence!=="every-6-hours") failures.push("cadence must remain every-6-hours");
if(!workflow.includes("schedule:")) failures.push("production smoke workflow must define a schedule trigger");
if(!workflow.includes('cron: "17 */6 * * *"')) failures.push("production smoke workflow must use the contracted six-hour cadence");
if(!workflow.includes("workflow_dispatch:")) failures.push("manual workflow dispatch must remain available");
if(!workflow.includes("permissions:\n  contents: read")) failures.push("workflow permissions must remain read-only");
if(!workflow.includes("node scripts/validate-production-smoke.mjs")) failures.push("scheduled monitor must reuse the production smoke validator");
if(smoke.production_origin!=="https://jawed.co.in") failures.push("production smoke origin drifted");
if(!Array.isArray(smoke.checks)||smoke.checks.length<1) failures.push("production smoke contract must retain at least one check");
if(contract.no_new_runtime_dependency!==true) failures.push("38F must not add runtime dependencies");
if(contract.failure_behavior!=="github-actions-workflow-failure") failures.push("failure behavior must remain GitHub Actions workflow failure");
if(contract.scope_boundary!=="monitor-production-availability-only") failures.push("scope boundary drifted");

if(failures.length){
  console.error("Production Availability Monitoring Gate FAILED");
  for(const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Production Availability Monitoring Gate PASSED");
console.log("Cadence: "+contract.cadence);
console.log("Smoke checks reused: "+smoke.checks.length);
