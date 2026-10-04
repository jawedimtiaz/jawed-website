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

assert.equal(finalDoc.includes("Status: **pre-activation / externally blocked**"),true,"Final status must remain pre-activation");
assert.equal(finalDoc.includes("production ad-serving configuration")&&finalDoc.includes("final CMP/consent configuration"),true,"External activation dependency is missing");
assert.equal(handoff.includes("Immediate rollback conditions"),true,"Activation rollback safeguard is missing");
assert.equal(handoff.includes("Google Sites status is **Ready**"),true,"Activation entry gate is missing");
assert.equal((workflow.match(/docs\/adsense-activation-handoff\.md/g)||[]).length,2,"Activation handoff must trigger both PR and main-push readiness CI");
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
