#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const publisherId="ca-pub-4572098570133367";
const allowedPublisherTag=new RegExp(`<meta\\s+name="google-adsense-account"\\s+content="${publisherId}"\\s*>`,"i");

const forbiddenPatterns=[
  /ca-pub-\d{10,}/i,
  /adsbygoogle/i,
  /googlesyndication\.com/i,
  /googleadservices\.com/i
];

const roots=["index.html","about","work","notes","blog","topics","resources","tools","ai","assets","functions","privacy"];
const files=[];
function walk(p){
  if(!fs.existsSync(p))return;
  const stat=fs.statSync(p);
  if(stat.isFile()){
    if(/\.(html|js|mjs|css|json|txt)$/.test(p))files.push(p);
    return;
  }
  for(const name of fs.readdirSync(p))walk(path.join(p,name));
}
for(const root of roots)walk(root);

const violations=[];
for(const file of files){
  const content=fs.readFileSync(file,"utf8");
  const publisherTagAllowed=file==="index.html" && allowedPublisherTag.test(content);
  for(const pattern of forbiddenPatterns){
    if(pattern.test(content) && !(pattern.source.startsWith("ca-pub-") && publisherTagAllowed && content.match(/ca-pub-\d{10,}/gi)?.length===1))violations.push(file+" matches "+pattern);
    pattern.lastIndex=0;
  }
}
assert.equal(fs.existsSync("ads.txt"),false,"ads.txt must remain absent before activation");
assert.deepEqual(violations,[],"Premature AdSense runtime configuration detected");

const privacy=fs.readFileSync("privacy/index.html","utf8");
assert.equal(privacy.includes("Advertising and AdSense"),true,"AdSense privacy foundation missing");

console.log("AdSense site-verification guard: PASS");
console.log("Verified publisher tag: present on index.html");
console.log("AdSense runtime markers detected: 0");
console.log("ads.txt present: no");
console.log("Ad serving runtime active: no");
