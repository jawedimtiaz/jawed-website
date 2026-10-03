#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const baseline=fs.readFileSync("docs/performance-monetization-baseline.md","utf8");
const budget=JSON.parse(fs.readFileSync("config/performance-budget.json","utf8"));
const analytics=fs.readFileSync("assets/js/analytics.js","utf8");
const index=fs.readFileSync("index.html","utf8");

assert.equal(budget.status,"baseline");
assert.equal(budget.ad_runtime_active,false);
assert.equal(baseline.includes("Source inspection alone cannot establish Core Web Vitals"),true);
assert.equal(baseline.includes("37B — Core Web Vitals protection"),true);
assert.equal(index.includes('<script src="/assets/js/analytics.js" defer></script>'),true);
assert.equal(analytics.includes("requestIdleCallback"),true);
assert.equal(analytics.includes("setTimeout(load,1500)"),true);
assert.equal(fs.existsSync("ads.txt"),false);
assert.equal(fs.readFileSync("_headers","utf8").includes("adsbygoogle"),false);

console.log("Phase 37A performance baseline: PASS");
console.log("AdSense runtime active: no");
console.log("Core Web Vitals values: targets only; no score claimed");
