#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const inventory=JSON.parse(fs.readFileSync("config/adsense-inventory.json","utf8"));
const headers=fs.readFileSync("public/_headers","utf8");
const files=[];
const roots=["index.html","public","src","assets"];
function walk(p){
 if(!fs.existsSync(p))return;
 const stat=fs.statSync(p);
 if(stat.isFile()){if(/\.(html|js|mjs|css|json|txt|tsx|ts)$/.test(p))files.push(p);return;}
 for(const name of fs.readdirSync(p))walk(path.join(p,name));
}
for(const root of roots)walk(root);
assert.equal(inventory.status,"pre-ads-review","Inventory must remain pre-activation");
assert.equal(inventory.excluded_initial.includes("/privacy/")&&inventory.excluded_initial.includes("/contact/")&&inventory.excluded_initial.includes("/ai/")&&inventory.excluded_initial.includes("/tools/"),true,"Initial exclusions must remain intact");
assert.equal(fs.existsSync("ads.txt"),false,"ads.txt must remain absent until publisher activation is approved");
assert.equal(/adsbygoogle|googlesyndication\.com|googleadservices\.com/i.test(headers),false,"Public CSP must not include guessed advertising runtime hosts");
const violations=[];
for(const file of files){
 const content=fs.readFileSync(file,"utf8");
 if(/ca-pub-\d{10,}/i.test(content))violations.push(file+" contains a publisher ID before activation");
 if(/adsbygoogle|googlesyndication\.com|googleadservices\.com/i.test(content))violations.push(file+" contains advertising runtime code before activation");
 if(/<script[^>]+(?:consent-manager|consentmanager|onetrust|cookiebot)/i.test(content))violations.push(file+" contains an unreviewed consent-manager runtime");
}
assert.deepEqual(violations,[],"Premature publisher/advertising/consent runtime configuration detected");
console.log("AdSense pre-activation guard: PASS");
console.log("Publisher ID in runtime: absent");
console.log("Ad-serving scripts and ads.txt: absent");
console.log("Consent runtime: not injected");
console.log("Activation status: externally gated; no Google approval inferred");
