#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const doc=fs.readFileSync("docs/ad-placement-layout-stability.md","utf8");
assert.equal(doc.includes("Advertising must occupy a reserved layout region"),true);
assert.equal(doc.includes("No global ad slot is added to excluded surfaces"),true);
assert.equal(doc.includes("No AdSense script"),true);
assert.equal(fs.existsSync("ads.txt"),false);
for(const p of ["index.html","about/index.html","work/index.html","notes/index.html","blog/index.html"]){
 const c=fs.readFileSync(p,"utf8");
 if(c.includes("adsbygoogle")) throw new Error("Live ad markup found in "+p);
}
console.log("Ad placement & layout stability contract: PASS");
