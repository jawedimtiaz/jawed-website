#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const htmlFiles=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if([".git","node_modules"].includes(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.name==="index.html"||entry.name==="404.html")htmlFiles.push(full);
  }
}
walk(root);

const canonicalForFile=file=>{
  if(file.endsWith("/404.html"))return null;
  const rel=path.relative(root,file).replaceAll(path.sep,"/");
  const urlPath=rel==="index.html"?"/":"/"+rel.replace(/index\.html$/,"");
  return "https://jawed.co.in"+urlPath;
};

let checked=0;
for(const file of htmlFiles){
  const html=fs.readFileSync(file,"utf8");
  const title=(html.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]||"";
  const description=(html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)||[])[1]||"";
  const canonical=(html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)||[])[1]||"";
  const h1=(html.match(/<h1\b/gi)||[]).length;
  assert.ok(title.trim(),`Missing title: ${file}`);
  assert.ok(description.trim(),`Missing meta description: ${file}`);
  assert.equal(h1,1,`Expected exactly one h1: ${file}`);
  const expected=canonicalForFile(file);
  if(expected)assert.equal(canonical,expected,`Canonical mismatch: ${file}`);
  checked++;
}

const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const locs=[...sitemap.matchAll(/<loc>(https:\/\/jawed\.co\.in[^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(locs).size,locs.length,"Sitemap contains duplicate URLs");
for(const url of locs){
  const pathname=new URL(url).pathname;
  const file=pathname==="/"?"index.html":path.join(root,pathname.replace(/^\//,""),"index.html");
  assert.equal(fs.existsSync(file),true,`Sitemap URL has no matching page: ${url}`);
}

console.log("Website content & SEO validation: PASS");
console.log("HTML pages checked:",checked);
console.log("Sitemap URLs checked:",locs.length);
console.log("Unique sitemap URLs:",new Set(locs).size);
