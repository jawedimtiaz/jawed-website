#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const contract=JSON.parse(fs.readFileSync("config/adsense-slot-contract.json","utf8"));
const css=fs.readFileSync("assets/css/style.css","utf8");

assert.equal(contract.responsive.breakpoint_px,760);
assert.equal(contract.responsive.minimum_supported_viewport_width_px,320);
assert.equal(contract.responsive.flow_only,true);
assert.equal(contract.responsive.allow_fixed_or_sticky,false);
assert.equal(contract.responsive.width,"100%");
assert.equal(contract.responsive.max_width,"100%");
assert.equal(contract.runtime_active,false);
assert.equal(css.includes(".ad-slot-boundary{display:block;width:100%;max-width:100%;min-width:0;min-height:280px;contain:layout}"),true);
assert.equal(css.includes("@media(max-width:760px){.ad-slot-boundary{min-height:180px}}"),true);
assert.equal(css.includes("position:fixed"),false,"Future ad-slot architecture must not introduce fixed positioning");
assert.equal(css.includes("position:sticky"),false,"Future ad-slot architecture must not introduce sticky positioning");
assert.equal(css.includes("100vw"),false,"Future ad-slot architecture must not introduce viewport-width overflow risk");
assert.equal(css.includes("adsbygoogle"),false,"AdSense runtime must remain inactive");

console.log("AdSense mobile/responsive readiness validation: PASS");
console.log("Viewport boundary: 320px minimum supported / 760px responsive breakpoint");
console.log("Slot positioning: normal document flow only");
console.log("Runtime activation: blocked");
