#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const policy=JSON.parse(fs.readFileSync("config/adsense-placement-policy.json","utf8"));
const inventory=JSON.parse(fs.readFileSync("config/adsense-inventory.json","utf8"));

assert.equal(policy.status,"pre-activation","Placement policy must remain pre-activation");
assert.equal(policy.allowed_slot_contexts.length>=3,true,"Placement policy must define substantive content contexts");
assert.equal(policy.forbidden_slot_contexts.includes("inside-primary-navigation"),true,"Navigation protection is missing");
assert.equal(policy.forbidden_slot_contexts.includes("adjacent-to-form-submit-controls"),true,"Form-control protection is missing");
assert.equal(policy.forbidden_slot_contexts.includes("inside-ai-conversation"),true,"AI exclusion is missing");
assert.equal(policy.forbidden_slot_contexts.includes("inside-interactive-tool-workspace"),true,"Tool-workspace exclusion is missing");
assert.equal(policy.forbidden_slot_contexts.includes("on-error-or-dead-end-pages"),true,"Dead-end exclusion is missing");
assert.equal(policy.rules.some(rule=>rule.includes("focal point")),true,"Content-focal rule is missing");
assert.equal(policy.rules.some(rule=>rule.includes("mistake them for navigation")),true,"Accidental-click placement rule is missing");
assert.equal(policy.rules.some(rule=>rule.includes("excluded route")),true,"Inventory boundary rule is missing");
assert.equal(inventory.status,"pre-ads-review","Inventory must remain pre-activation");

console.log("AdSense placement policy validation: PASS");
console.log("Allowed slot contexts:",policy.allowed_slot_contexts.length);
console.log("Forbidden slot contexts:",policy.forbidden_slot_contexts.length);
