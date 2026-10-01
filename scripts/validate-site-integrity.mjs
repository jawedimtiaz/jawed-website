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

const publishedHtml=sourcePaths.filter(file=>file.endsWith(".html"));
const routeForSource=file=>file==="index.html"?"/":"/"+file.replace(/\\/g,"/").replace(/\/index\.html$/,"")+"/";
const publishedRoutes=new Set(publishedHtml.map(routeForSource));
const internalLinkIssues=[];
for(const file of publishedHtml){
  const html=fs.readFileSync(file,"utf8");
  for(const match of html.matchAll(/(?:href|action)=["']([^"']+)["']/g)){
    const value=match[1];
    if(!value.startsWith("/")||value.startsWith("//")||value.startsWith("/ai/?q="))continue;
    const hashIndex=value.indexOf("#");
    const targetPath=hashIndex===-1?value:value.slice(0,hashIndex);
    const fragment=hashIndex===-1?"":decodeURIComponent(value.slice(hashIndex+1));
    const normalizedPath=targetPath===""?"/":(targetPath.endsWith("/")?targetPath:targetPath+"/");
    if(!publishedRoutes.has(normalizedPath)){
      internalLinkIssues.push(file+" -> "+value);
      continue;
    }
    if(fragment){
      const targetSource=normalizedPath==="/"?"index.html":normalizedPath.replace(/^\/+|\/+$/g,"")+"/index.html";
      const targetHtml=fs.readFileSync(targetSource,"utf8");
      const hasFragment=targetHtml.includes('id="'+fragment+'"')||targetHtml.includes("id='"+fragment+"'")||targetHtml.includes('name="'+fragment+'"')||targetHtml.includes("name='"+fragment+"'");
      if(!hasFragment)internalLinkIssues.push(file+" -> "+value);
    }
  }
}
if(internalLinkIssues.length)errors.push("Internal links or fragment targets are invalid: "+internalLinkIssues.join(", "));

const careerMatch=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchSavedContentContract=[
  ["Career Match saved content is sanitized before storage",careerMatch.includes("function safeSavedHtml(html)")&&careerMatch.includes("html:safeSavedHtml($("#results").innerHTML)")],
  ["Career Match saved content is sanitized before restore",careerMatch.includes('$("#results").innerHTML=safeSavedHtml(x.html)')],
  ["Career Match sanitizer removes event-handler attributes",careerMatch.includes('a.name.toLowerCase().startsWith("on")')]
];
const missingCareerMatchContracts=careerMatchSavedContentContract.filter(([,ok])=>!ok).map(([name])=>name);
if(missingCareerMatchContracts.length)errors.push("Career Match saved-content contract missing: "+missingCareerMatchContracts.join(", "));

const mainJs=fs.readFileSync("assets/js/main.js","utf8");
const discoveryQueryBoundaryContract=[
  ["discovery URL query is bounded to 200 characters",mainJs.includes("initial.trim().slice(0,200)")],
  ["typed discovery query is bounded to 200 characters",mainJs.includes("i.value.trim().slice(0,200)")]
];
const missingDiscoveryQueryBoundaryContracts=discoveryQueryBoundaryContract.filter(([,ok])=>!ok).map(([name])=>name);
const discoveryHistoryContract=[
  ["discovery filter listens for browser history navigation",mainJs.includes("window.addEventListener('popstate',()=>{const current=new URLSearchParams(window.location.search).get('q')||''")],
  ["history navigation re-applies discovery filtering",mainJs.includes("i.value=current;update(false)")]
];
const discoveryUrlNormalizationContract=[
  ["deep-linked discovery query is normalized in the URL",mainJs.includes("const normalized=initial.trim().slice(0,200)")&&mainJs.includes("next.searchParams.set('q',normalized)")&&mainJs.includes("window.history.replaceState")]
];
const missingDiscoveryHistoryContracts=discoveryHistoryContract.filter(([,ok])=>!ok).map(([name])=>name);
const missingDiscoveryUrlNormalizationContracts=discoveryUrlNormalizationContract.filter(([,ok])=>!ok).map(([name])=>name);
const discoveryAiContract=[
  ["AI handoff captures the active discovery query",mainJs.includes("const aiLink=document.querySelector('.ai-discovery-card a[href^=\"/ai/?q=\"]')")],
  ["AI handoff bounds copied discovery context",mainJs.includes("raw.slice(0,200)")],
  ["AI handoff encodes the contextual prompt through URLSearchParams",mainJs.includes("aiUrl.searchParams.set('q',handoff)")]
];
const discoveryFilterContract=[
  ["notes filter excludes Jawed AI handoff",mainJs.includes("selector:'main .card:not(.ai-discovery-card),main section[id^=\"subject-\"]'")&&mainJs.includes("label:'note results'")],
  ["tools filter excludes Jawed AI handoff",mainJs.includes("selector:'main .card:not(.ai-discovery-card)',label:'tool results'")],
  ["topics filter excludes Jawed AI handoff",mainJs.includes("selector:'main section:not(.discovery-panel) .card:not(.ai-discovery-card)',label:'topic results'")],
  ["blog filter excludes Jawed AI handoff",mainJs.includes("selector:'main .card:not(.ai-discovery-card)',label:'post results'")],
  ["resources filter excludes Jawed AI handoff",mainJs.includes("selector:'main .card:not(.ai-discovery-card)',label:'resource results'")]
];
const missingDiscoveryContracts=discoveryFilterContract.filter(([,ok])=>!ok).map(([name])=>name);
const missingDiscoveryAiContracts=discoveryAiContract.filter(([,ok])=>!ok).map(([name])=>name);
if(missingDiscoveryQueryBoundaryContracts.length)errors.push("Discovery query-boundary contract missing: "+missingDiscoveryQueryBoundaryContracts.join(", "));
if(missingDiscoveryHistoryContracts.length)errors.push("Discovery browser-history contract missing: "+missingDiscoveryHistoryContracts.join(", "));
if(missingDiscoveryUrlNormalizationContracts.length)errors.push("Discovery URL-normalization contract missing: "+missingDiscoveryUrlNormalizationContracts.join(", "));
if(missingDiscoveryAiContracts.length)errors.push("Discovery-to-AI context contract missing: "+missingDiscoveryAiContracts.join(", "));
if(missingDiscoveryContracts.length)errors.push("Discovery filter contract missing: "+missingDiscoveryContracts.join(", "));
if(sitemapUrls.length!==siteUrls.length)errors.push("Sitemap contains URLs outside https://jawed.co.in/.");
if(duplicateSitemapPaths.length)errors.push("Sitemap contains duplicate paths: "+[...new Set(duplicateSitemapPaths)].join(", "));
if(missingSources.length)errors.push("Sitemap pages have no repository source file: "+missingSources.join(", "));
if(unsitemapPages.length)errors.push("Published HTML pages are missing from sitemap: "+unsitemapPages.join(", "));
assert.equal(errors.length,0,errors.join("\n"));
console.log("Career Match saved-content security contract: PASS");
const careerMatchTabs=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchTabContract=careerMatchTabs.includes('role="tablist"')&&careerMatchTabs.includes('role="tab"')&&careerMatchTabs.includes('aria-selected="true"')&&careerMatchTabs.includes('aria-controls="v-results"')&&careerMatchTabs.includes("careerTabs");
if(!careerMatchTabContract)errors.push("Career Match view controls must expose accessible tab semantics and keyboard navigation");
else console.log("Career Match view accessibility contract: PASS");

console.log("Internal link and fragment integrity: PASS");
const financeSnapshot=fs.readFileSync("tools/personal-finance-snapshot/index.html","utf8");
const financeSnapshotResetContract=financeSnapshot.includes("defaults=Object.fromEntries(ids.map(id=>[id,$(id).value]))")&&financeSnapshot.includes("ids.forEach(id=>$(id).value=defaults[id])");
if(!financeSnapshotResetContract)errors.push("Personal Finance Snapshot reset must restore all calculator fields, including fields outside the form");
else console.log("Personal Finance Snapshot reset contract: PASS");

console.log("Discovery filter exclusion contract: PASS");
console.log("Site sitemap/page parity: PASS");
console.log("Sitemap pages:",sitemapPaths.length);
console.log("Published HTML pages audited:",sourcePaths.length);
console.log("Unsitemap published pages:",unsitemapPages.length);
console.log("Missing sitemap source files:",missingSources.length);
