#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const inventory=JSON.parse(fs.readFileSync("config/adsense-inventory.json","utf8"));
const sitemap=fs.readFileSync("sitemap.xml","utf8");
const app=fs.readFileSync("src/App.tsx","utf8");
const locations=[...sitemap.matchAll(/<loc>https:\/\/jawed\.co\.in([^<]*)<\/loc>/g)].map(m=>m[1]||"/");
const sitemapRoutes=new Set(locations);
const routePatterns=[...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(m=>m[1]);
function normalize(path){const p=path.split(/[?#]/,1)[0]||"/";return p==="/"?"/":p.replace(/\/+$/,"");}
function routeMatches(pattern,path){
 const a=normalize(pattern).split("/").filter(Boolean),b=normalize(path).split("/").filter(Boolean);let i=0;
 for(;i<a.length;i++){if(a[i]==="*")return true;if(i>=b.length)return false;if(a[i].startsWith(":"))continue;if(a[i]!==b[i])return false;}
 return i===b.length;
}
assert.equal(inventory.status,"pre-ads-review","Inventory must remain explicitly pre-activation until reviewed");
assert.equal(Array.isArray(inventory.eligible_initial),true,"Eligible inventory must be an array");
assert.equal(Array.isArray(inventory.excluded_initial),true,"Excluded inventory must be an array");
assert.equal(inventory.eligible_initial.length>0,true,"Eligible inventory must not be empty");
for(const route of ["/ai/","/tools/","/privacy/","/contact/"])assert.equal(inventory.excluded_initial.includes(route),true,"Required excluded surface missing: "+route);
assert.equal(inventory.eligible_initial.every(route=>sitemapRoutes.has(route)),true,"Every eligible canonical route must exist in the sitemap");
for(const route of inventory.eligible_initial)assert.equal(routePatterns.some(pattern=>routeMatches(pattern,route)),true,"Eligible route is not registered in React Router: "+route);
for(const route of inventory.excluded_initial)assert.equal(routePatterns.some(pattern=>routeMatches(pattern,route)),true,"Excluded route must exist in React Router, but need not be listed in the sitemap: "+route);
assert.equal(new Set([...inventory.eligible_initial,...inventory.excluded_initial]).size,inventory.eligible_initial.length+inventory.excluded_initial.length,"Initial inventory must not contain overlapping routes");
for(const alias of ["/notes/","/guides/","/diagnostic-tools/","/services/"])assert.equal(sitemapRoutes.has(alias),false,"Non-canonical alias must not be in the sitemap: "+alias);
for(const rule of inventory.rules)assert.equal(typeof rule,"string","Inventory rules must be strings");
console.log("AdSense inventory boundary validation: PASS");
console.log("Initial eligible canonical routes:",inventory.eligible_initial.length);
console.log("Initial excluded routes:",inventory.excluded_initial.length);
console.log("Excluded routes are required to exist in React Router, not to be indexed.");
console.log("Status:",inventory.status);
