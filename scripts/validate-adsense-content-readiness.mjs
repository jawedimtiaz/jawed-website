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

const knowledgeBase=fs.readFileSync("notes/it-troubleshooting-guide-knowledge-base/index.html","utf8");
for(const phrase of [
  "Worked example: turn one ticket into a reusable guide",
  "Illustrative example only; not a record of a real user or employer.",
  "The cause has not been confirmed.",
  "Do not state that the password reset caused the failure.",
  "Confirm the user can complete the original VPN connection workflow"
])assert.equal(knowledgeBase.includes(phrase),true,"Knowledge-base worked-example contract missing: "+phrase);

const retirementWithdrawals=fs.readFileSync("notes/retirement-withdrawals-sequence-risk-income-review/index.html","utf8");
for(const phrase of [
  "Retirement Withdrawals: Sequence Risk, Income and Annual Reviews",
  "Why the sequence of returns matters",
  "Both paths contain a 20% gain and a 20% loss.",
  "PFRDA NPS All Citizen Model information",
  "Investor.gov retirement income guidance",
  "Financial Content Disclosure"
])assert.equal(retirementWithdrawals.includes(phrase),true,"Retirement withdrawal guide contract missing: "+phrase);
const startPortfolio=100,annualWithdrawal=10;
const gainThenLoss=(startPortfolio*1.2-annualWithdrawal)*0.8-annualWithdrawal;
const lossThenGain=(startPortfolio*0.8-annualWithdrawal)*1.2-annualWithdrawal;
assert.equal(gainThenLoss,78,"Gain-then-loss illustrative sequence arithmetic changed");
assert.equal(lossThenGain,74,"Loss-then-gain illustrative sequence arithmetic changed");
assert.equal(retirementWithdrawals.includes("₹78L")&&retirementWithdrawals.includes("₹74L"),true,"Published sequence-risk example must match its independently calculated outcomes");
assert.equal(retirementWithdrawals.includes("/notes/retirement-corpus-calculation-framework/"),true,"Withdrawal guide must link to the corpus framework");
assert.equal(retirementWithdrawals.includes("/tools/retirement-planning-calculator/"),true,"Withdrawal guide must link to the retirement calculator");

const portfolioGuide=fs.readFileSync("notes/portfolio-allocation-rebalancing-framework/index.html","utf8");
for(const phrase of [
  "Worked example: calculate allocation drift",
  "Current allocation weight = current value of the asset category",
  "₹10 lakh portfolio",
  "+8 percentage points",
  "−8 percentage points",
  "does not, by itself, tell you that a trade is required.",
  "Financial Content Disclosure"
])assert.equal(portfolioGuide.includes(phrase),true,"Portfolio allocation worked-example contract missing: "+phrase);
assert.equal(portfolioGuide.includes('dateModified":"2026-10-12"'),true,"Portfolio allocation Article dateModified must match the visible update date");

const usInvestingGuide=fs.readFileSync("notes/us-stocks-etfs-starting-point/index.html","utf8");
for(const phrase of [
  "Worked example: two ETFs can still overlap",
  "Company X",
  "₹2.5 lakh (25%)",
  "₹2.0 lakh (20%)",
  "₹4.5 lakh (45%)",
  "not proof of diversification",
  "Financial Content Disclosure"
])assert.equal(usInvestingGuide.includes(phrase),true,"US stocks/ETF worked-example contract missing: "+phrase);
assert.equal(usInvestingGuide.includes('dateModified":"2026-10-12"'),true,"US stocks/ETF Article dateModified must match visible update date");

const taxYearGuide=fs.readFileSync("notes/indian-income-tax-practical-starting-point/index.html","utf8");
for(const phrase of [
  "Important scope update: AY 2026-27 and Tax Year 2026-27 are different periods",
  "Income-tax Act, 1961",
  "Income-tax Act, 2025",
  "Tax Year 2026-27",
  "Updated-FQAs-on-Interplay%26Transitions.pdf",
  "tax-rates-and-computation",
  "Sources checked: 2026-10-12"
])assert.equal(taxYearGuide.includes(phrase),true,"Tax-year transition guidance missing: "+phrase);
assert.equal(taxYearGuide.includes('"dateModified":"2026-10-12"'),true,"Tax guide schema modified date must match the review date");
const taxRegimeComparison=fs.readFileSync("notes/new-vs-old-tax-regime-comparison/index.html","utf8");
for(const phrase of [
  "Check the tax year before using this comparison",
  "Income-tax Act, 1961",
  "Income-tax Act, 2025",
  "Tax Year 2026-27",
  "Updated-FQAs-on-Interplay%26Transitions.pdf",
  "tax-rates-and-computation"
])assert.equal(taxRegimeComparison.includes(phrase),true,"Tax regime comparison transition guidance missing: "+phrase);


const blogIndex=fs.readFileSync("blog/index.html","utf8");
for(const phrase of [
  "How to use these posts",
  "it is not a real user or employer incident",
  "For an immediate troubleshooting sequence, start with the relevant Note.",
  "primary documentation linked in Resources",
  'href="/notes/"',
  'href="/resources/"'
])assert.equal(blogIndex.includes(phrase),true,"Blog index editorial context missing: "+phrase);

const skillsPage=fs.readFileSync("work/skills/index.html","utf8");
for(const phrase of [
  "How I apply these skills",
  "establish whether the symptoms follow a user, device or service",
  "choose a low-risk check that can distinguish likely causes",
  "not a claim of equal depth across every listed product",
  'href="/notes/it-service-desk-troubleshooting-workflow/"',
  'href="/notes/network-connectivity-first-response-checklist/"'
])assert.equal(skillsPage.includes(phrase),true,"Skills page evidence context missing: "+phrase);

console.log("AdSense content readiness validation: PASS");
console.log("Content inventory routes checked:",inventory.eligible_initial.length+inventory.excluded_initial.length);
console.log("Google approval claimed: no");
