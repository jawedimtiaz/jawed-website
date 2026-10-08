#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";

const sitemap=fs.readFileSync("sitemap.xml","utf8");
const tree=execFileSync("git",["ls-files","*.html"],{encoding:"utf8"}).trim().split(/\r?\n/).filter(Boolean);
const sourcePath=(url)=>url==="/"?"index.html":url.replace(/^\/+|\/+$/g,"")+"/index.html";
const sitemapUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1].trim());
const siteUrls=sitemapUrls.filter(url=>url.startsWith("https://jawed.co.in/"));
const nonCanonicalSitemapUrls=sitemapUrls.filter(url=>!url.startsWith("https://jawed.co.in/"));
const sitemapPaths=siteUrls.map(url=>url.slice("https://jawed.co.in".length)||"/");
const sourcePaths=tree.filter(file=>file!=="404.html"&&!file.startsWith("google")).filter(file=>{
  const html=fs.readFileSync(file,"utf8");
  return !/<meta\\s+name=["']robots["']\\s+content=["'][^"']*\\bnoindex\\b/i.test(html);
});
const missingSources=sitemapPaths.filter(path=>!fs.existsSync(sourcePath(path)));
const unsitemapPages=sourcePaths.filter(file=>{
  const path=file==="index.html"?"/":"/"+file.replace(/\/index\.html$/,"")+"/";
  return !sitemapPaths.includes(path);
});
const duplicateSitemapPaths=sitemapPaths.filter((path,index)=>sitemapPaths.indexOf(path)!==index);
const errors=[];
if(nonCanonicalSitemapUrls.length)errors.push("Sitemap contains non-canonical URLs: "+nonCanonicalSitemapUrls.join(", "));
if(missingSources.length)errors.push("Sitemap routes missing source pages: "+missingSources.join(", "));
if(unsitemapPages.length)errors.push("Published HTML pages missing from sitemap: "+unsitemapPages.join(", "));
if(duplicateSitemapPaths.length)errors.push("Sitemap contains duplicate routes: "+duplicateSitemapPaths.join(", "));

const blogArticle=fs.readFileSync("blog/rebuilding-jawed-co-in/index.html","utf8");
const blogBreadcrumbContract=blogArticle.includes('"@type":"BreadcrumbList"')&&blogArticle.includes('"position":1,"name":"Home"')&&blogArticle.includes('"position":2,"name":"Blog"')&&blogArticle.includes('"position":3,"name":"Rebuilding Jawed.co.in"');
if(!blogBreadcrumbContract)errors.push("Blog article must preserve breadcrumb structured data matching the visible Home > Blog > Article path");
else console.log("Blog breadcrumb structured-data contract: PASS");

const blogArticleContract=blogArticle.includes('"@type":"BlogPosting"')&&blogArticle.includes('"datePublished":"2026-09-27"')&&blogArticle.includes('"author":{"@type":"Person","name":"Jawed Imtiaz"');
if(!blogArticleContract)errors.push("Blog article must preserve BlogPosting author/date structured data");
else console.log("BlogPosting structured-data contract: PASS");

