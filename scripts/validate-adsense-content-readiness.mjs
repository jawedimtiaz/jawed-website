#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const inventory=JSON.parse(read("config/adsense-inventory.json"));
const sitemap=read("public/sitemap.xml");
const robots=read("public/robots.txt");
const app=read("src/App.tsx");
const notes=JSON.parse(read("src/data/notesData.json"));
const blogs=JSON.parse(read("src/data/blogData.json"));
const citationPlaceholderPattern=/turn0search\d+|cite|/;
const routePatterns=[...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(m=>m[1]);
function routeMatches(pattern,path){
 const a=pattern.split("/").filter(Boolean),b=path.split("/").filter(Boolean);let i=0;
 for(;i<a.length;i++){if(a[i]==="*")return true;if(i>=b.length)return false;if(a[i].startsWith(":"))continue;if(a[i]!==b[i])return false;}
 return i===b.length;
}
function wordCount(html){return html.replace(/<[^>]*>/g," ").replace(/&(?:nbsp|amp|quot|#39|lt|gt);/g," ").split(/\s+/).filter(Boolean).length;}
const urls=[...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].trim());
assert.equal(inventory.status,"pre-ads-review","Ad inventory must remain pre-activation");
assert.equal(Array.isArray(inventory.eligible_initial)&&inventory.eligible_initial.length>0,true,"Initial eligible route inventory is required");
assert.equal(Array.isArray(inventory.excluded_initial)&&inventory.excluded_initial.includes("/tools/")&&inventory.excluded_initial.includes("/ai/")&&inventory.excluded_initial.includes("/privacy/"),true,"Interactive and privacy routes must remain excluded from initial ad inventory");
assert.equal(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),true,"Sitemap must use the standard XML namespace");
assert.equal(new Set(urls).size,urls.length,"Sitemap must not contain duplicate URLs");
assert.equal(robots.includes("User-agent: *")&&robots.includes("Allow: /")&&robots.includes("Sitemap: https://jawed.co.in/sitemap.xml"),true,"robots.txt must allow crawling and declare the canonical sitemap");
for(const urlText of urls){
 const url=new URL(urlText);
 assert.equal(url.origin,"https://jawed.co.in","Sitemap must use canonical HTTPS origin");
 assert.equal(url.search+url.hash,"","Sitemap URLs must not include query strings or fragments");
 const path=url.pathname.replace(/\/$/,"")||"/";
 assert.equal(routePatterns.some(pattern=>routeMatches(pattern,path)),true,"Sitemap route is not registered in React Router: "+path);
}
for(const route of inventory.eligible_initial){
 const path=route.replace(/\/$/,"")||"/";
 assert.equal(routePatterns.some(pattern=>routeMatches(pattern,path)),true,"Eligible inventory route is not registered in React Router: "+route);
}
for(const route of inventory.excluded_initial){
 const path=route.replace(/\/$/,"")||"/";
 assert.equal(routePatterns.some(pattern=>routeMatches(pattern,path)),true,"Excluded inventory route is not registered in React Router: "+route);
}
assert.equal(notes.length>=20,true,"Current notes knowledge base unexpectedly small");
assert.equal(blogs.length>=1,true,"Current blog data is missing");
for(const [kind,entries] of [["note",notes],["blog",blogs]]){
 const slugs=new Set();
 for(const entry of entries){
  assert.equal(typeof entry.slug==="string"&&entry.slug.length>2,true,kind+" slug is required");
  assert.equal(slugs.has(entry.slug),false,"Duplicate "+kind+" slug: "+entry.slug);slugs.add(entry.slug);
  assert.equal(typeof entry.title==="string"&&entry.title.trim().length>5,true,kind+" title missing: "+entry.slug);
  assert.equal(typeof entry.description==="string"&&entry.description.trim().length>40,true,kind+" description missing/too short: "+entry.slug);
  assert.equal(typeof entry.content==="string"&&wordCount(entry.content)>=180,true,kind+" content is unexpectedly short or missing: "+entry.slug);
  assert.equal((entry.content.match(/<h2\b/gi)||[]).length>=3,true,kind+" needs a meaningful section structure: "+entry.slug);
  assert.equal(citationPlaceholderPattern.test(entry.content),false,kind+" exposes internal citation placeholders: "+entry.slug);
 }
}
const ai=JSON.parse(read("src/data/aiKnowledge.json"));
assert.equal(Array.isArray(ai.entries)&&ai.entries.length>0,true,"AI knowledge source inventory is missing");
const finalDoc=read("docs/adsense-final-readiness.md");
assert.equal(finalDoc.includes("Repository CI cannot prove Google approval."),true,"Readiness assessment must not imply Google approval");
assert.equal(finalDoc.includes("Do not activate ad scripts, visible ad slots, `ads.txt`"),true,"Ad activation must remain gated");
console.log("AdSense content readiness validation: PASS");
console.log("React routes:",routePatterns.length,"; sitemap URLs:",urls.length,"; note entries:",notes.length,"; blog entries:",blogs.length);
console.log("Scope: structural content/readiness checks only; no Google approval or policy certification asserted.");
