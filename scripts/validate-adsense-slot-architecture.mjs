#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const contract=JSON.parse(fs.readFileSync("config/adsense-slot-contract.json","utf8"));
const placement=JSON.parse(fs.readFileSync("config/adsense-placement-policy.json","utf8"));
const inventory=JSON.parse(fs.readFileSync("config/adsense-inventory.json","utf8"));
const css=fs.readFileSync("assets/css/style.css","utf8");

assert.equal(contract.status,"pre-activation");
assert.equal(contract.runtime_active,false);
assert.equal(contract.slot_class,"ad-slot-boundary");
assert.equal(contract.reservation.desktop_min_height_px,280);
assert.equal(contract.reservation.mobile_min_height_px,180);
assert.equal(contract.reservation.no_runtime_effect_before_activation,true);
for(const route of ["/contact/","/privacy/","/ai/","/tools/"]) assert.equal(contract.excluded_routes.includes(route),true);
assert.deepEqual([...contract.allowed_contexts].sort(),[...placement.allowed_slot_contexts].sort());
for(const surface of contract.excluded_surfaces) assert.equal(placement.forbidden_slot_contexts.length>0,true);
assert.equal(inventory.status,"pre-ads-review");
assert.equal(css.includes(".ad-slot-boundary"),true,"Future ad-slot CSS boundary is missing");
assert.equal(css.includes("min-height:280px"),true,"Desktop ad-slot reservation is missing");
assert.equal(css.includes("min-height:180px"),true,"Mobile ad-slot reservation is missing");
assert.equal(css.includes("adsbygoogle"),false,"AdSense runtime must remain inactive");
assert.equal(css.includes("googlesyndication.com"),false,"Advertising runtime must remain inactive");

console.log("AdSense slot architecture validation: PASS");
console.log("Runtime activation: blocked");
console.log("Excluded routes: /contact/ /privacy/ /ai/ /tools/");
console.log("Layout reservation: desktop 280px / mobile 180px");
