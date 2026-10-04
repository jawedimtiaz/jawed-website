#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const finalDoc=fs.readFileSync("docs/adsense-final-readiness.md","utf8");
const privacy=fs.readFileSync("privacy/index.html","utf8");
const inventory=JSON.parse(fs.readFileSync("config/adsense-inventory.json","utf8"));
const placement=JSON.parse(fs.readFileSync("config/adsense-placement-policy.json","utf8"));
const headers=fs.readFileSync("_headers","utf8");
const workflow=fs.readFileSync(".github/workflows/adsense-readiness.yml","utf8");
const handoff=fs.readFileSync("docs/adsense-activation-handoff.md","utf8");
const aggregate=fs.readFileSync("scripts/validate-adsense-readiness.mjs","utf8");
const siteIntegrityWorkflow=fs.readFileSync(".github/workflows/site-integrity.yml","utf8");
const securityWorkflow=fs.readFileSync(".github/workflows/production-security-headers.yml","utf8");
const smokeWorkflow=fs.readFileSync(".github/workflows/production-smoke-reliability.yml","utf8");
const deploymentWorkflow=fs.readFileSync(".github/workflows/deployment-runtime-reliability.yml","utf8");
function triggerPaths(workflow, trigger){
  const start=workflow.indexOf(trigger);
  assert.notEqual(start,-1,"Workflow trigger missing: "+trigger);
  const next=workflow.indexOf("\n  push:",start);
  const end=trigger==="  pull_request:" ? next : workflow.indexOf("\n  workflow_dispatch:",start);
  assert.notEqual(end,-1,"Workflow trigger boundary missing: "+trigger);
  return [...workflow.slice(start,end).matchAll(/^      - "([^"]+)"$/gm)].map(m=>m[1]).sort();
}

const prTriggerPaths=triggerPaths(workflow,"  pull_request:");
const pushTriggerPaths=triggerPaths(workflow,"  push:");
assert.deepEqual(prTriggerPaths,pushTriggerPaths,"PR and main-push readiness trigger paths must remain identical");
assert.equal(workflow.includes("workflow_dispatch:"),true,"Manual readiness dispatch must remain available");
assert.equal(workflow.includes("permissions:\n  contents: read"),true,"Read-only workflow permissions are required");
assert.equal(workflow.includes("timeout-minutes: 2"),true,"Readiness workflow timeout must remain bounded");
assert.equal(workflow.includes("cancel-in-progress: true"),true,"Readiness workflow concurrency cancellation must remain enabled");

const criticalTriggerPaths=[
  "sitemap.xml",
  "privacy/index.html",
  "assets/css/style.css",
  "_headers",
  "config/performance-budget.json",
  "config/adsense-inventory.json",
  "config/adsense-slot-contract.json",
  "config/adsense-consent-contract.json",
  "config/adsense-performance-safeguards.json",
  "config/adsense-final-performance-gate.json",
  "docs/adsense-content-readiness.md",
  "docs/adsense-technical-activation.md",
  "docs/adsense-activation-contract.md",
  "docs/adsense-activation-handoff.md"
];

for(const path of criticalTriggerPaths){
  const occurrences=workflow.split(path).length-1;
  assert.equal(occurrences>=2,true,"Critical readiness path must trigger both PR and push CI: "+path);
}
assert.equal(finalDoc.includes("Status: **pre-activation / externally blocked**"),true,"Final status must remain pre-activation");
assert.equal(finalDoc.includes("production ad-serving configuration")&&finalDoc.includes("final CMP/consent configuration"),true,"External activation dependency is missing");
assert.equal(handoff.includes("Immediate rollback conditions"),true,"Activation rollback safeguard is missing");
assert.equal(handoff.includes("Exact status observed at activation"),true,"Activation evidence must record the observed Google status");
assert.equal(handoff.includes("Full Git commit SHA"),true,"Activation evidence must record the activation commit");
assert.equal(handoff.includes("Aggregate validator result"),true,"Activation evidence must record aggregate validator results");
assert.equal(handoff.includes("Production smoke"),true,"Activation evidence must record production smoke results");
assert.equal(handoff.includes("Final CSP diff"),true,"Activation evidence must record the final CSP review");
assert.equal(handoff.includes("CMP/consent"),true,"Activation evidence must record consent behavior");
assert.equal(handoff.includes("Final eligible/excluded route review"),true,"Activation evidence must record inventory review");
assert.equal(handoff.includes("Pre-activation commit SHA retained"),true,"Activation evidence must retain the rollback commit");
assert.equal(handoff.includes("Do not record publisher secrets"),true,"Activation evidence must prohibit unnecessary account credentials");
assert.equal(handoff.includes("Google Sites status is **Ready**"),true,"Activation entry gate is missing");
assert.equal(handoff.includes("site-integrity"),true,"Activation handoff must require site-integrity verification");
assert.equal(handoff.includes("production security"),true,"Activation handoff must require production security verification");
assert.equal(handoff.includes("production smoke"),true,"Activation handoff must require production smoke verification");
assert.equal(handoff.includes("deployment runtime"),true,"Activation handoff must require deployment-runtime verification");
assert.equal(siteIntegrityWorkflow.includes("node scripts/validate-site-integrity.mjs"),true,"Site-integrity workflow contract missing");
assert.equal(securityWorkflow.includes("node scripts/validate-production-security-headers.mjs"),true,"Production security workflow contract missing");
assert.equal(smokeWorkflow.includes("node scripts/validate-production-smoke.mjs"),true,"Production smoke workflow contract missing");
assert.equal(deploymentWorkflow.includes("node scripts/validate-deployment-runtime-reliability.mjs"),true,"Deployment runtime workflow contract missing");
assert.equal((workflow.match(/docs\/adsense-activation-handoff\.md/g)||[]).length,2,"Activation handoff must trigger both PR and main-push readiness CI");
assert.equal(aggregate.includes("Validator count:")&&aggregate.includes("AdSense readiness aggregate gate: PASS"),true,"Aggregate readiness runner is incomplete");
assert.equal((aggregate.match(/validate-adsense-[a-z-]+\.mjs/g)||[]).length,13,"Aggregate runner must cover all 13 AdSense validators");
assert.equal((workflow.match(/run: node scripts\/validate-adsense-(?!readiness\.mjs)[a-z-]+\.mjs/g)||[]).length,13,"CI must execute the 13 individual AdSense validators");
assert.equal(workflow.includes("run: node scripts/validate-adsense-readiness.mjs"),true,"CI must execute the aggregate AdSense readiness gate");
assert.equal((workflow.match(/docs\/adsense-activation-handoff\.md/g)||[]).length,2,"Activation handoff must appear once in each trigger");
assert.equal(finalDoc.includes("Do not activate ad scripts, visible ad slots, `ads.txt`"),true,"Activation safeguard is missing");
assert.equal(privacy.includes("<h2>Advertising and AdSense</h2>"),true,"AdSense privacy foundation is missing");
assert.equal(inventory.status,"pre-ads-review","Inventory must remain pre-activation");
assert.equal(placement.status,"pre-activation","Placement policy must remain pre-activation");
assert.equal(fs.existsSync("ads.txt"),false,"ads.txt must remain absent before publisher activation");
assert.equal(!headers.includes("adsbygoogle"),true,"No publisher-specific CSP token may be guessed before activation");
assert.equal(!workflow.includes("adsbygoogle"),true,"Readiness workflow must not embed ad runtime code");
assert.equal(!workflow.includes("ca-pub-"),true,"Readiness workflow must not contain a guessed publisher ID");
assert.equal(fs.existsSync("scripts/validate-adsense-privacy.mjs"),true,"Privacy validator missing");
assert.equal(fs.existsSync("scripts/validate-adsense-inventory.mjs"),true,"Inventory validator missing");
assert.equal(fs.existsSync("scripts/validate-adsense-activation.mjs"),true,"Activation validator missing");
assert.equal(fs.existsSync("scripts/validate-adsense-content-readiness.mjs"),true,"Content readiness validator missing");
assert.equal(fs.existsSync("scripts/validate-adsense-placement-policy.mjs"),true,"Placement validator missing");
assert.equal(fs.existsSync("scripts/validate-adsense-technical.mjs"),true,"Technical validator missing");

console.log("AdSense final readiness validation: PASS");
console.log("Repository readiness control families: 11");
console.log("External account activation required: yes");
console.log("AdSense runtime enabled: no");
