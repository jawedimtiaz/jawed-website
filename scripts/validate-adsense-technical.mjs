#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const audit=fs.readFileSync("docs/adsense-technical-activation.md","utf8");
const headers=fs.readFileSync("_headers","utf8");

assert.equal(audit.includes("Status: **pre-activation**"),true,"Technical audit must remain pre-activation");
assert.equal(audit.includes("real publisher ID"),true,"Publisher identity dependency is missing");
assert.equal(audit.includes("add the exact Google-provided publisher record"),true,"ads.txt dependency is missing");
assert.equal(audit.includes("add only the domains actually required"),true,"CSP activation rule is missing");
assert.equal(audit.includes("Do not add guessed Google ad domains to CSP."),true,"CSP no-guess safeguard is missing");
assert.equal(audit.includes("Do not add an empty or placeholder `ads.txt`."),true,"ads.txt no-placeholder safeguard is missing");
assert.equal(audit.includes("Do not add a guessed publisher ID."),true,"Publisher ID no-guess safeguard is missing");
assert.equal(audit.includes("Consent/CMP")||audit.includes("consent/CMP"),true,"Consent technical check is missing");
assert.equal(headers.includes("Content-Security-Policy:"),true,"Site CSP header is missing");
assert.equal(fs.existsSync("ads.txt"),false,"ads.txt must remain absent before real publisher activation");
assert.equal(!headers.includes("adsbygoogle"),true,"CSP must not contain a guessed adsbygoogle token before activation");

console.log("AdSense technical activation validation: PASS");
console.log("ads.txt present: no");
console.log("Guessed publisher/CSP values asserted: no");
