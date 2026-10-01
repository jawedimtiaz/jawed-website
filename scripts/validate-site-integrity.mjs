#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";

const sitemap=fs.readFileSync("sitemap.xml","utf8");
const tree=execFileSync("git",["ls-files","*.html"],{encoding:"utf8"}).trim().split(/\r?\n/).filter(Boolean);
const sourcePath=(url)=>url==="/"?"index.html":url.replace(/^\/+|\/+$/g,"")+"/index.html";
const sitemapUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1].trim());
const siteUrls=sitemapUrls.filter(url=>url.startsWith("https://jawed.co.in/"));
const sitemapPaths=siteUrls.map(url=>url.slice("https://jawed.co.in".length)||"/");
const sourcePaths=tree.filter(file=>file!=="404.html"&&!file.startsWith("google"));
const missingSources=sitemapPaths.filter(path=>!fs.existsSync(sourcePath(path)));
const unsitemapPages=sourcePaths.filter(file=>{
  const path=file==="index.html"?"/":"/"+file.replace(/\/index\.html$/,"")+"/";
  return !sitemapPaths.includes(path);
});
const duplicateSitemapPaths=sitemapPaths.filter((path,index)=>sitemapPaths.indexOf(path)!==index);
const errors=[];
if(sitemapUrls.length!==siteUrls.length)errors.push("Sitemap contains URLs outside https://jawed.co.in/.");
if(duplicateSitemapPaths.length)errors.push("Sitemap contains duplicate paths: "+[...new Set(duplicateSitemapPaths)].join(", "));
if(missingSources.length)errors.push("Sitemap pages have no repository source file: "+missingSources.join(", "));
if(unsitemapPages.length)errors.push("Published HTML pages are missing from sitemap: "+unsitemapPages.join(", "));
assert.equal(errors.length,0,errors.join("\n"));
console.log("Site sitemap/page parity: PASS");
console.log("Sitemap pages:",sitemapPaths.length);
console.log("Published HTML pages audited:",sourcePaths.length);
console.log("Unsitemap published pages:",unsitemapPages.length);
console.log("Missing sitemap source files:",missingSources.length);
