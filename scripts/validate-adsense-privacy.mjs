#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const privacy=fs.readFileSync("privacy/index.html","utf8");

const contracts=[
  ["privacy page identifies advertising and AdSense",privacy.includes("<h2>Advertising and AdSense</h2>")],
  ["privacy page discloses third-party advertising cookies",privacy.includes("third-party vendors, including Google")&&privacy.includes("cookies or similar technologies")],
  ["privacy page discloses prior-visit based advertising",privacy.includes("prior visits to this or other websites")],
  ["privacy page explains personalized advertising",privacy.includes("personalize ads")],
  ["privacy page provides Google Ads Settings",privacy.includes('href="https://adssettings.google.com/"')],
  ["privacy page identifies regional consent requirements",privacy.includes("European Economic Area")&&privacy.includes("United Kingdom")&&privacy.includes("Switzerland")],
  ["privacy page identifies Google's certified CMP requirement",privacy.includes("Google-certified consent management platform")&&privacy.includes("Transparency and Consent Framework")],
  ["privacy page avoids claiming ads are already enabled",privacy.includes("If Google AdSense or another advertising service is enabled")],
  ["privacy page distinguishes site verification from ad serving",privacy.includes("connected to the publisher's AdSense account for site verification and review")&&privacy.includes("Advertising cookies, advertising scripts, ad slots, and advertising partners will be introduced only when the corresponding advertising service is actually enabled")],
  ["privacy page retains privacy contact",privacy.includes("mailto:webmaster@jawed.co.in")]
];

for(const [name,ok] of contracts){
  assert.equal(ok,true,name+" contract is missing");
  console.log("PASS — "+name);
}

console.log("\nAdSense privacy readiness validation: PASS");
console.log("Contracts checked:",contracts.length);
console.log("Ad code or publisher ID asserted: no");
