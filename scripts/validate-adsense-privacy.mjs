#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const privacy=fs.readFileSync("src/pages/PrivacyPage.tsx","utf8");
const app=fs.readFileSync("src/App.tsx","utf8");
const inventory=JSON.parse(fs.readFileSync("config/adsense-inventory.json","utf8"));
const checks=[
 ["privacy page is a registered React route",app.includes('path="/privacy/*"')&&app.includes("<PrivacyPage")],
 ["privacy page identifies the publisher and purpose",privacy.includes("Privacy Policy")&&privacy.includes("Jawed.co.in")],
 ["privacy page explains local processing of diagnostic tools",privacy.includes("entirely locally within your web browser")&&privacy.includes("No resume text")],
 ["privacy page provides Google Ads Settings",privacy.includes("https://adssettings.google.com/")],
 ["privacy page identifies regional consent requirements",privacy.includes("European Economic Area")&&privacy.includes("Switzerland")&&privacy.includes("certified Consent Management Platform")],
 ["privacy page provides privacy contact",privacy.includes("mailto:webmaster@jawed.co.in")],
 ["AdSense inventory keeps AI, tools, and privacy excluded initially",inventory.excluded_initial.includes("/ai/")&&inventory.excluded_initial.includes("/tools/")&&inventory.excluded_initial.includes("/privacy/")],
 ["advertising status is conditional and not falsely described as active",privacy.includes("advertising is not active merely because")&&privacy.includes("will be introduced only after")],
 ["analytics status is conditional and not falsely described as active",privacy.includes("This policy does not mean that GA4 is currently active")],
 ["policy does not promise approval or certify legal compliance",!privacy.includes("Google AdSense approved")&&!privacy.includes("guaranteed compliant")]
];
for(const [name,ok] of checks){assert.equal(ok,true,name);console.log("PASS — "+name);}
console.log("\nAdSense privacy readiness validation: PASS");
console.log("Checks:",checks.length);
console.log("Source checks do not certify legal compliance or Google approval.");
