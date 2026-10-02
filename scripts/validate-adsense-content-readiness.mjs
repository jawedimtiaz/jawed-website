#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const audit=fs.readFileSync("docs/adsense-content-readiness.md","utf8");
const inventory=JSON.parse(fs.readFileSync("config/adsense-inventory.json","utf8"));

for(const route of ["/","/about/","/work/","/notes/","/topics/","/resources/","/blog/"])assert.equal(inventory.eligible_initial.includes(route),true,"Eligible content route missing from inventory: "+route);
for(const route of ["/ai/","/tools/","/contact/","/privacy/"])assert.equal(inventory.excluded_initial.includes(route),true,"Excluded route missing from inventory: "+route);
assert.equal(audit.includes("This is a site-specific readiness assessment, not a Google approval or policy determination."),true,"Audit must preserve its non-approval limitation");
assert.equal(audit.includes("Ads should initially be restricted to the approved inventory boundary"),true,"Audit must bind activation to the inventory boundary");
assert.equal(audit.includes("interactive AI surface"),true,"AI exclusion rationale is missing");
assert.equal(audit.includes("interactive utilities"),true,"Tool exclusion rationale is missing");
assert.equal(audit.includes("original long-form writing"),true,"Blog content assessment is missing");

console.log("AdSense content readiness validation: PASS");
console.log("Content inventory routes checked:",inventory.eligible_initial.length+inventory.excluded_initial.length);
console.log("Google approval claimed: no");
