#!/usr/bin/env node
import fs from "node:fs";

const sitemap=fs.readFileSync("sitemap.xml","utf8");
const knowledge=JSON.parse(fs.readFileSync("assets/data/ai-knowledge.json","utf8"));
const excluded=new Set(knowledge.coverage_policy?.excluded_paths||[]);
const sitemapPaths=[...sitemap.matchAll(/<loc>https:\/\/jawed\.co\.in([^<]*)<\/loc>/g)].map(match=>match[1]||"/");
const indexPaths=knowledge.entries.map(entry=>entry.url);

const unique=(items)=>new Set(items);
const duplicates=indexPaths.filter((path,index)=>indexPaths.indexOf(path)!==index);
const missing=sitemapPaths.filter(path=>!excluded.has(path)&&!indexPaths.includes(path));
const unexpected=indexPaths.filter(path=>!sitemapPaths.includes(path));
const excludedIndexed=[...excluded].filter(path=>indexPaths.includes(path));
const malformed=knowledge.entries.filter(entry=>!entry.url||!entry.title||!entry.summary||!Array.isArray(entry.keywords)||!entry.keywords.length);

const errors=[];
if(new Set(sitemapPaths).size!==sitemapPaths.length)errors.push("Sitemap contains duplicate URLs.");
if(duplicates.length)errors.push("AI knowledge contains duplicate URLs: "+[...new Set(duplicates)].join(", "));
if(missing.length)errors.push("Sitemap content pages missing from AI knowledge: "+missing.join(", "));
if(unexpected.length)errors.push("AI knowledge contains URLs not present in sitemap: "+unexpected.join(", "));
if(excludedIndexed.length)errors.push("Excluded paths are indexed: "+excludedIndexed.join(", "));
if(malformed.length)errors.push("AI knowledge contains malformed entries.");

const MIN_SUMMARY_CHARS=70;
const shortSummaries=knowledge.entries.filter(entry=>typeof entry.summary!=="string"||entry.summary.trim().length<MIN_SUMMARY_CHARS);
if(shortSummaries.length)errors.push("AI knowledge summaries below "+MIN_SUMMARY_CHARS+" characters: "+shortSummaries.map(entry=>entry.title).join(", "));
if(typeof knowledge.coverage_policy?.summary_evidence_rule!=="string"||!knowledge.coverage_policy.summary_evidence_rule.includes("scope-level evidence"))errors.push("AI knowledge evidence boundary is not documented.");

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("AI knowledge coverage OK");
console.log("Sitemap URLs:",sitemapPaths.length);
console.log("Excluded:",excluded.size);
console.log("Grounding entries:",indexPaths.length);
console.log("Reviewed against sitemap:",knowledge.reviewed_against_sitemap_on||"not recorded");
