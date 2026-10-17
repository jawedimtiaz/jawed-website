#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const inventory=JSON.parse(fs.readFileSync("config/adsense-inventory.json","utf8"));
const sitemap=fs.readFileSync("sitemap.xml","utf8");
const routes=new Set([...sitemap.matchAll(/<loc>https:\/\/jawed\.co\.in([^<]*)<\/loc>/g)].map(m=>m[1]||"/"));

assert.equal(inventory.status,"pre-ads-review","Inventory must remain explicitly pre-ads until activation work is approved");
assert.equal(Array.isArray(inventory.eligible_initial),true,"Eligible inventory must be an array");
assert.equal(Array.isArray(inventory.excluded_initial),true,"Excluded inventory must be an array");
assert.equal(inventory.eligible_initial.length>0,true,"Eligible inventory must not be empty");
assert.equal(inventory.excluded_initial.includes("/ai/"),true,"AI surface must remain excluded initially");
assert.equal(inventory.excluded_initial.includes("/tools/"),true,"Interactive tools must remain excluded initially");
assert.equal(inventory.excluded_initial.includes("/privacy/"),true,"Privacy page must remain excluded initially");
assert.equal(inventory.excluded_initial.includes("/contact/"),true,"Contact page must remain excluded initially");
assert.equal(inventory.eligible_initial.every(route=>routes.has(route)) ,true,"Every eligible route must exist in the sitemap");
assert.equal(inventory.excluded_initial.every(route=>[...routes].some(p=>route==="/tools/"?p.startsWith("/tools/"):p===route)),true,"Every excluded route must exist in the sitemap or represent the tools collection");
assert.equal(new Set([...inventory.eligible_initial,...inventory.excluded_initial]).size,inventory.eligible_initial.length+inventory.excluded_initial.length,"Initial inventory must not contain overlapping routes");

for(const rule of inventory.rules)assert.equal(typeof rule,"string","Inventory rules must be strings");

console.log("AdSense inventory boundary validation: PASS");
console.log("Initial eligible routes:",inventory.eligible_initial.length);
console.log("Initial excluded routes:",inventory.excluded_initial.length);
console.log("Status:",inventory.status);
