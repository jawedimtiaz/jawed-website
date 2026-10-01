#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";

const sitemap=fs.readFileSync("sitemap.xml","utf8");
const knowledge=JSON.parse(fs.readFileSync("assets/data/ai-knowledge.json","utf8"));
const excluded=new Set(knowledge.coverage_policy?.excluded_paths||[]);
const allSitemapLocs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1].trim());
const sitemapPaths=allSitemapLocs
  .filter(url=>url.startsWith("https://jawed.co.in/"))
  .map(url=>url.slice("https://jawed.co.in".length)||"/");
const workflow=fs.readFileSync(".github/workflows/ai-regression.yml","utf8");
const indexPaths=knowledge.entries.map(entry=>entry.url);
const sourcePath=(url)=>url==="/"?"index.html":url.replace(/^\/+|\/+$/g,"")+"/index.html";
const missingSourceFiles=sitemapPaths
  .filter(path=>!excluded.has(path))
  .filter(path=>!fs.existsSync(sourcePath(path)));

const unique=(items)=>new Set(items);
const duplicates=indexPaths.filter((path,index)=>indexPaths.indexOf(path)!==index);
const missing=sitemapPaths.filter(path=>!excluded.has(path)&&!indexPaths.includes(path));
const unexpected=indexPaths.filter(path=>!sitemapPaths.includes(path));
const excludedIndexed=[...excluded].filter(path=>indexPaths.includes(path));
const malformed=knowledge.entries.filter(entry=>!entry.url||!entry.title||!entry.summary||!Array.isArray(entry.keywords)||!entry.keywords.length);
const reviewDate=knowledge.reviewed_against_sitemap_on;
const reviewDateMs=typeof reviewDate==="string"&&!Number.isNaN(Date.parse(reviewDate+"T23:59:59Z"))?Date.parse(reviewDate+"T23:59:59Z"):NaN;
const groundingSourceFiles=sitemapPaths.filter(path=>!excluded.has(path)).map(sourcePath);
const sourceFreshnessErrors=[];
const changedSourceFiles=Number.isNaN(reviewDateMs)?[]:groundingSourceFiles.filter(file=>{
  try{
    return Boolean(execFileSync("git",["log","--since="+reviewDate+"T23:59:59Z","--format=%H","--",file],{encoding:"utf8"}).trim());
  }catch{
    sourceFreshnessErrors.push(file);
    return false;
  }
});

const requiredWorkflowPaths=new Set(["index.html"]);
for(const path of sitemapPaths.filter(path=>path!=="/"&&!excluded.has(path))){
  const family=path.split("/").filter(Boolean)[0];
  if(family)requiredWorkflowPaths.add(family+"/**");
}
const workflowLines=workflow.split(/\r?\n/);
const sectionBetween=(startLine,endLine)=>workflowLines.slice(
  workflowLines.indexOf(startLine)+1,
  endLine?workflowLines.indexOf(endLine):workflowLines.length
);
const pullRequestPaths=sectionBetween("  pull_request:","  workflow_dispatch:");
const pushPaths=sectionBetween("  push:","  permissions:");
const pathCount=(section,path)=>section.filter(line=>line.trim()===`- "${path}"`).length;
const workflowMissing=[...requiredWorkflowPaths].filter(path=>pathCount(pullRequestPaths,path)!==1||pathCount(pushPaths,path)!==1);
const workflowPathLines=(section)=>section.filter(line=>/^      - ".*"$/.test(line)).map(line=>line.trim().slice(3,-1));
const workflowDuplicatePaths=[...new Set([...workflowPathLines(pullRequestPaths),...workflowPathLines(pushPaths)])].filter(path=>pathCount(pullRequestPaths,path)>1||pathCount(pushPaths,path)>1);

const errors=[];
if(Number.isNaN(reviewDateMs))errors.push("AI knowledge reviewed_against_sitemap_on is missing or invalid.");
if(sourceFreshnessErrors.length)errors.push("AI knowledge source freshness could not be verified because git history lookup failed for: "+sourceFreshnessErrors.join(", "));
if(changedSourceFiles.length)errors.push("AI knowledge summaries are stale because grounding source files changed after the recorded review date: "+changedSourceFiles.join(", "));
if(allSitemapLocs.length!==sitemapPaths.length)errors.push("Sitemap contains one or more <loc> URLs outside the expected https://jawed.co.in/ origin or with an unsupported format.");
if(workflowMissing.length)errors.push("AI regression workflow trigger parity is incomplete for grounding source paths: "+workflowMissing.join(", "));
if(workflowDuplicatePaths.length)errors.push("AI regression workflow contains duplicate path filters: "+workflowDuplicatePaths.join(", "));
if(new Set(sitemapPaths).size!==sitemapPaths.length)errors.push("Sitemap contains duplicate URLs.");
if(duplicates.length)errors.push("AI knowledge contains duplicate URLs: "+[...new Set(duplicates)].join(", "));
if(missing.length)errors.push("Sitemap content pages missing from AI knowledge: "+missing.join(", "));
if(unexpected.length)errors.push("AI knowledge contains URLs not present in sitemap: "+unexpected.join(", "));
if(excludedIndexed.length)errors.push("Excluded paths are indexed: "+excludedIndexed.join(", "));
if(malformed.length)errors.push("AI knowledge contains malformed entries.");
if(missingSourceFiles.length)errors.push("Sitemap grounding pages have no repository source file: "+missingSourceFiles.join(", "));

const MIN_SUMMARY_CHARS=70;
const shortSummaries=knowledge.entries.filter(entry=>typeof entry.summary!=="string"||entry.summary.trim().length<MIN_SUMMARY_CHARS);
if(shortSummaries.length)errors.push("AI knowledge summaries below "+MIN_SUMMARY_CHARS+" characters: "+shortSummaries.map(entry=>entry.title).join(", "));
if(typeof knowledge.coverage_policy?.summary_evidence_rule!=="string"||!knowledge.coverage_policy.summary_evidence_rule.includes("scope-level evidence"))errors.push("AI knowledge evidence boundary is not documented.");

assert.equal(errors.length,0,errors.join("\n"));

console.log("AI knowledge coverage OK");
console.log("Sitemap URLs:",sitemapPaths.length);
console.log("Excluded:",excluded.size);
console.log("Grounding entries:",indexPaths.length);
console.log("Sitemap source files verified:",sitemapPaths.filter(path=>!excluded.has(path)).length);
console.log("Reviewed against sitemap:",knowledge.reviewed_against_sitemap_on||"not recorded");
console.log("Source freshness since review date: clean");
