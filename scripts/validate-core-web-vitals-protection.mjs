#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const htmlFiles=execFileSync("git",["ls-files","*.html"],{encoding:"utf8"}).trim().split("\n").filter(Boolean).filter(file=>fs.readFileSync(file,"utf8").trimStart().toLowerCase().startsWith("<!doctype html"));
assert.ok(htmlFiles.length>0,"HTML inventory must not be empty");

for(const file of htmlFiles){
  const html=fs.readFileSync(file,"utf8");
  assert.equal(html.includes("https://www.googletagmanager.com/gtag/js?id=G-14C5DCPM15"),false,`immediate GA loader remains in ${file}`);
  const count=(html.match(/<script src="\/assets\/js\/analytics\.js" defer><\/script>/g)||[]).length;
  assert.equal(count,1,`analytics loader must occur exactly once in ${file}`);
}

const analytics=fs.readFileSync("assets/js/analytics.js","utf8");
assert.equal(analytics.includes("requestIdleCallback"),true,"analytics must use idle scheduling where supported");
assert.equal(analytics.includes("setTimeout(load,1500)"),true,"analytics must have a bounded fallback");
const css=fs.readFileSync("assets/css/style.css","utf8");
assert.equal(css.includes("transition:"),true,"existing UI transitions must remain covered by the shared stylesheet");
const budget=JSON.parse(fs.readFileSync("config/performance-budget.json","utf8"));
assert.equal(budget.budgets.lcp.target_ms,2500);
assert.equal(budget.budgets.inp.target_ms,200);
assert.equal(budget.budgets.cls.target,0.1);

console.log(`Core Web Vitals protection: PASS (${htmlFiles.length} HTML files checked)`);
console.log("Analytics loading: deferred/idle");
console.log("LCP/INP/CLS: regression targets enforced; no unmeasured score claimed");
