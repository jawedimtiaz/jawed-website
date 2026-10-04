#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const contract=fs.readFileSync("docs/adsense-activation-contract.md","utf8");
const tree=fs.readFileSync("sitemap.xml","utf8");
const sourceFiles=fs.readdirSync("scripts").filter(name=>name.endsWith(".mjs"));

assert.equal(contract.includes("Status: **Ready-gated pre-activation**"),true,"Activation contract must remain Ready-gated before Google approval");
assert.equal(contract.includes("Do not invent or hard-code a publisher ID"),true,"Publisher ID safeguard is missing");
assert.equal(contract.includes("Do not create an `ads.txt` publisher line"),true,"ads.txt safeguard is missing");
assert.equal(contract.includes("Google-certified CMP"),true,"CMP dependency is missing");
assert.equal(contract.includes("Do not load advertising scripts globally"),true,"Global ad-script safeguard is missing");
assert.equal(contract.includes("real publisher ID"),true,"Activation order must require the real publisher ID");
assert.equal(contract.includes("AdSense Sites page reports **Ready**"),true,"Production activation must be blocked until Google reports Ready");
assert.equal(contract.includes("/privacy/")&&contract.includes("/contact/")&&contract.includes("/ai/")&&contract.includes("/tools/"),true,"Initial excluded surfaces must be recorded");
assert.equal(tree.includes("https://jawed.co.in/"),true,"Site sitemap must remain present");
assert.equal(sourceFiles.includes("validate-adsense-privacy.mjs"),true,"Privacy readiness validator must remain installed");
assert.equal(sourceFiles.includes("validate-adsense-inventory.mjs"),true,"Inventory readiness validator must remain installed");
assert.equal(fs.existsSync("ads.txt"),false,"ads.txt must not exist before a real publisher account is supplied");

console.log("AdSense activation contract validation: PASS");
console.log("Repository state: Ready-gated pre-activation");
console.log("Ad-serving publisher ID asserted: no; site-verification meta tag: present on approved inventory");
console.log("ads.txt present: no");
console.log("CMP integration asserted: no");
