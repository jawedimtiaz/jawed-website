#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

// Independent numeric vectors for the published calculator methodologies.
// These tests validate the expected math and guard the page source against
// accidental formula/input-validation drift; they do not emulate a browser.
const closeTo = (actual, expected, tolerance = 0.01) => {
  assert.equal(Number.isFinite(actual), true, `expected a finite result, got ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`);
};

const growthHtml = fs.readFileSync("tools/compound-growth-sip-calculator/index.html", "utf8");
const goalHtml = fs.readFileSync("tools/inflation-goal-planning-calculator/index.html", "utf8");
const retirementHtml = fs.readFileSync("tools/retirement-planning-calculator/index.html", "utf8");

// Compound growth & SIP: end-of-month contributions, annual return / 12.
const sip = (P, C, years, annualRate) => {
  const n = Math.round(years * 12);
  const r = annualRate / 100 / 12;
  const value = r === 0 ? P + C * n : P * (1 + r) ** n + C * (((1 + r) ** n - 1) / r);
  return { value, invested: P + C * n, growth: value - (P + C * n) };
};
const sipDefault = sip(100000, 10000, 10, 10);
closeTo(sipDefault.value, 2319153.9381209165);
closeTo(sipDefault.invested, 1300000);
closeTo(sipDefault.growth, 1019153.9381209165);
closeTo(sip(1000, 100, 1, 0).value, 2200);
closeTo(sip(1000, 100, 0, 10).value, 1000);
assert.match(growthHtml, /P\*factor\+C\*\(\(factor-1\)\/r\)/);
assert.match(growthHtml, /if\(r===0\)\{value=P\+C\*n\}/);
assert.match(growthHtml, /field\.value\.trim\(\)===""\|\|!field\.checkValidity\(\)/);
assert.match(growthHtml, /id="growth-reset"/);
assert.match(growthHtml, /reset\.addEventListener\("click",\(\)=>\{f\.reset\(\);err\.textContent="";calculate\(\)\}\)/, "SIP reset must restore defaults and recalculate the default result");

// Inflation & goal planning: future cost = current cost × (1 + rate)^years.
const goal = (cost, years, annualInflation, savings) => {
  const future = cost * (1 + annualInflation / 100) ** years;
  return { future, increase: future - cost, gap: Math.max(0, future - savings) };
};
const goalDefault = goal(1000000, 10, 6, 200000);
closeTo(goalDefault.future, 1790847.6965428547);
closeTo(goalDefault.increase, 790847.6965428547);
closeTo(goalDefault.gap, 1590847.6965428547);
closeTo(goal(1000000, 10, 0, 1200000).future, 1000000);
closeTo(goal(1000000, 10, 0, 1200000).gap, 0);
closeTo(goal(0, 10, 6, 0).future, 0);
assert.match(goalHtml, /c\*Math\.pow\(1\+i,y\)/);
assert.match(goalHtml, /Math\.max\(0,futureCost-s\)/);
assert.match(goalHtml, /field\.value\.trim\(\)===""\|\|!field\.checkValidity\(\)/);

// Retirement: monthly accumulation plus finite-horizon real-return annuity.
const retirement = ({ age, retirementAge, lifespan, spending, corpus, monthly, inflation, preReturn, realReturn }) => {
  const years = retirementAge - age;
  const months = Math.round(years * 12);
  const horizon = lifespan - retirementAge;
  const futureSpending = spending * (1 + inflation / 100) ** years;
  const monthlyRate = preReturn / 100 / 12;
  const projected = monthlyRate === 0
    ? corpus + monthly * months
    : corpus * (1 + monthlyRate) ** months + monthly * (((1 + monthlyRate) ** months - 1) / monthlyRate);
  const real = realReturn / 100;
  const required = real === 0 ? futureSpending * horizon : futureSpending * (1 - (1 + real) ** (-horizon)) / real;
  return { years, horizon, futureSpending, projected, required, gap: projected - required };
};
const retirementDefault = retirement({ age: 45, retirementAge: 58, lifespan: 88, spending: 720000, corpus: 3000000, monthly: 30000, inflation: 6, preReturn: 10, realReturn: 3 });
closeTo(retirementDefault.futureSpending, 1535708.347304893);
closeTo(retirementDefault.projected, 20487255.618722133);
closeTo(retirementDefault.required, 30100561.391240735);
closeTo(retirementDefault.gap, -9613305.772518601);
const zeroReal = retirement({ age: 40, retirementAge: 60, lifespan: 80, spending: 100000, corpus: 0, monthly: 0, inflation: 0, preReturn: 0, realReturn: 0 });
closeTo(zeroReal.projected, 0);
closeTo(zeroReal.required, 2000000);
assert.match(retirementHtml, /v\.spending\*Math\.pow\(1\+inflation,years\)/);
assert.match(retirementHtml, /if\(preMonthly===0\)\{projected=v\.corpus\+v\.contribution\*months\}/);
assert.match(retirementHtml, /if\(real===0\)\{required=futureSpending\*horizon\}/);
assert.match(retirementHtml, /el\[id\]\.value\.trim\(\)===""\|\|!el\[id\]\.checkValidity\(\)/);

for (const [file, html, ids] of [
  ["SIP", growthHtml, ["initial", "monthly", "years", "return"]],
  ["goal", goalHtml, ["cost", "years", "inflation", "savings"]],
  ["retirement", retirementHtml, ["age", "spending", "corpus", "contribution", "retirementAge", "lifespan", "inflation", "preReturn", "realReturn"]],
]) {
  for (const id of ids) assert.match(html, new RegExp(`id="${id}"[^>]*required`), `${file}: ${id} must remain required`);
}

console.log("Finance calculator regression: PASS");
console.log("Independent vectors: SIP default/zero-return/zero-period; goal default/zero-inflation/covered-goal; retirement default/zero-real-return.");
console.log("Source guards: published formulas, required inputs, native validity checks.");
console.log("Browser rendering and interaction are not simulated by this test.");
