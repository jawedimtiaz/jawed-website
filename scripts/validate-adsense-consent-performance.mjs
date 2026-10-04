#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const contract=JSON.parse(fs.readFileSync("config/adsense-consent-contract.json","utf8"));
const activation=fs.readFileSync("docs/adsense-activation-contract.md","utf8");
const sourceFiles=[];
const walk=(dir)=>{
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name==="node_modules"||entry.name===".git")continue;
    const p=dir+"/"+entry.name;
    if(entry.isDirectory())walk(p);
    else if(entry.name.endsWith(".html"))sourceFiles.push(p);
  }
};
walk(".");

assert.equal(contract.status,"pre-activation");
assert.equal(contract.cmp_runtime_active,false);
assert.equal(contract.personalized_ads_allowed,false);\nassert.deepEqual(contract.activation_dependencies,["AdSense reports Ready","real publisher account configuration is supplied","Google-certified CMP configuration is supplied where required","privacy policy matches the enabled advertising mode","eligible inventory and placement checks pass"],"Consent activation dependency contract drifted");
assert.equal(contract.rendering.cmp_must_not_block_initial_publisher_content,true);
assert.equal(contract.rendering.ad_requests_must_wait_for_required_consent,true);
assert.equal(contract.rendering.no_global_cmp_runtime_injection_before_activation,true);
assert.equal(contract.rules.some(rule=>rule.includes("speculative CMP script")),true);
assert.equal(contract.rules.some(rule=>rule.includes("Do not block the initial page render")),true);
assert.equal(activation.includes("The site currently has no AdSense CMP integration."),true);
assert.equal(activation.includes("Do not load advertising scripts globally before the consent architecture is finalized."),true);

for(const file of sourceFiles){
  const html=fs.readFileSync(file,"utf8");
  assert.equal(/googlesyndication\.com|adsbygoogle/i.test(html),false,"Advertising runtime must remain absent from "+file);
  assert.equal(/<script[^>]+cmp|consent-manager|consentmanager|onetrust|cookiebot/i.test(html),false,"Speculative CMP runtime must remain absent from "+file);
}

console.log("AdSense consent/CMP performance validation: PASS");
console.log("CMP runtime: inactive");
console.log("Personalized advertising: blocked until real consent configuration");
console.log("Initial render blocking: prohibited");
