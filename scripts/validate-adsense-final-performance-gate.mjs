#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const gate=JSON.parse(fs.readFileSync("config/adsense-final-performance-gate.json","utf8"));
const budget=JSON.parse(fs.readFileSync("config/performance-budget.json","utf8"));
const slot=JSON.parse(fs.readFileSync("config/adsense-slot-contract.json","utf8"));
const consent=JSON.parse(fs.readFileSync("config/adsense-consent-contract.json","utf8"));
const safeguards=JSON.parse(fs.readFileSync("config/adsense-performance-safeguards.json","utf8"));
const activation=fs.readFileSync("docs/adsense-activation-contract.md","utf8");
const finalReadiness=fs.readFileSync("docs/adsense-final-readiness.md","utf8");
const headers=fs.readFileSync("_headers","utf8");

assert.equal(gate.status,"pre-activation");
assert.equal(gate.activation_blocked_until_google_ready,true);
assert.equal(gate.runtime_active,false);\nassert.deepEqual(gate.required_controls,["37B Core Web Vitals protection","37C ad-slot architecture","37D mobile responsive safeguards","37E consent/CMP performance boundary","37F monetization performance safeguards"],"Final AdSense gate required-controls contract drifted");
assert.equal(budget.ad_runtime_active,false);
assert.equal(slot.runtime_active,false);
assert.equal(consent.cmp_runtime_active,false);
assert.equal(safeguards.runtime_active,false);
assert.equal(consent.rendering.ad_requests_must_wait_for_required_consent,true,"Consent contract must require consent before ad requests");
assert.equal(safeguards.loading.consent_state_must_precede_required_ad_requests,true,"Performance safeguards must require consent before ad requests");
assert.equal(consent.rendering.no_global_cmp_runtime_injection_before_activation,true,"Consent contract must prohibit pre-activation global CMP runtime");
assert.equal(safeguards.loading.advertising_script_must_not_be_loaded_globally_before_activation,true,"Performance safeguards must prohibit pre-activation global advertising runtime");
assert.equal(gate.external_gate.required_adsense_sites_status,"Ready");
assert.equal(gate.external_gate.getting_ready_is_not_ready,true);
assert.equal(activation.includes("Production advertising activation is blocked until the AdSense Sites page reports **Ready**"),true);
assert.equal(activation.includes("`Getting ready` means Google is still running its site checks"),true);
assert.equal(finalReadiness.includes("pre-activation / externally blocked"),true);
assert.equal(finalReadiness.includes("Do not activate ad scripts"),true);
assert.equal(fs.existsSync("ads.txt"),false);
assert.equal(/adsbygoogle|googlesyndication\.com|doubleclick\.net|googleadservices\.com/i.test(headers),false);

const sourceFiles=[];
const walk=(dir)=>{
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name==="node_modules"||entry.name===".git")continue;
    const p=dir+"/"+entry.name;
    if(entry.isDirectory())walk(p);
    else if(/\.(html|css)$/.test(entry.name)||(p.startsWith("./assets/js/")&&entry.name.endsWith(".js")))sourceFiles.push(p);
  }
};
walk(".");
for(const file of sourceFiles){
  const text=fs.readFileSync(file,"utf8");
  assert.equal(/adsbygoogle|googlesyndication\.com|doubleclick\.net|googleadservices\.com/i.test(text),false,"Advertising runtime found before activation in "+file);
}
for(const file of sourceFiles.filter(file=>file.endsWith(".html"))){
  const text=fs.readFileSync(file,"utf8");
  assert.equal(text.includes('gtag("config","G-14C5DCPM15")'),false,"Inline GA config remains in "+file);
}

console.log("Final AdSense pre-activation performance gate: PASS");
console.log("Repository activation: BLOCKED until Google Ads/AdSense status is Ready");
console.log("Ad runtime / ads.txt / speculative ad hosts: absent");
console.log("37B-37F safeguards: required and represented in the final gate");
