#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const headers=fs.readFileSync("public/_headers","utf8");
const rootHeaders=fs.readFileSync("_headers","utf8");
const redirects=fs.readFileSync("public/_redirects","utf8");
const rootRedirects=fs.readFileSync("_redirects","utf8");
const deploymentContract=JSON.parse(fs.readFileSync("config/deployment-runtime-contract.json","utf8"));
const deploymentHeaders=deploymentContract.required_security_headers;
assert.equal(Array.isArray(deploymentHeaders)&&deploymentHeaders.length>0,true,"Deployment security-header contract must be non-empty");
assert.equal(deploymentHeaders.every(value=>typeof value==="string"&&value.trim().length>0),true,"Deployment security-header contract must contain non-empty strings");

const requiredHeaders=[
 "X-Frame-Options: DENY",
 "Cross-Origin-Opener-Policy: same-origin",
 "X-Content-Type-Options: nosniff",
 "X-Permitted-Cross-Domain-Policies: none",
 "Referrer-Policy: strict-origin-when-cross-origin",
 "Permissions-Policy: geolocation=(), microphone=(self), camera=()",
 "Strict-Transport-Security: max-age=31536000",
 "Content-Security-Policy:"
];
for(const value of requiredHeaders){
 assert.equal(headers.includes(value),true,"Published security header contract missing: "+value);
 assert.equal(rootHeaders.includes(value),true,"Root reference security header contract missing: "+value);
}
const csp=headers.match(/Content-Security-Policy:\s*([^\n]+)/)?.[1]||"";
for(const directive of ["default-src 'self'","base-uri 'self'","frame-ancestors 'none'","frame-src 'none'","form-action 'self' mailto:","object-src 'none'","script-src ","worker-src ","connect-src ","img-src ","style-src ","font-src "]){
 assert.equal(csp.includes(directive),true,"CSP directive missing: "+directive);
}
assert.equal(csp.includes("https://www.googletagmanager.com"),true,"CSP must retain the deferred analytics tag-manager origin");
assert.equal(csp.includes("https://www.google-analytics.com"),true,"CSP must retain the analytics collection origin");
assert.equal(csp.includes("https://cdnjs.cloudflare.com"),true,"CSP must retain the approved PDF reader resource origin");
assert.equal(/adsbygoogle|googlesyndication\.com|googleadservices\.com/i.test(csp),false,"Ad-serving hosts must remain absent before activation");
assert.equal(csp.includes("unsafe-eval"),false,"CSP must not permit unsafe-eval");
assert.equal(csp.includes("frame-ancestors 'none'"),true,"CSP must prevent framing");

assert.equal(fs.existsSync("functions/api/transcribe.ts"),true,"Audio transcription must be implemented as a reviewed Cloudflare Pages Function");
assert.equal(fs.existsSync("public/_routes.json"),false,"Obsolete API-only route configuration must not be published");
assert.deepEqual(deploymentContract.api_routes,["/api/transcribe"],"Only the reviewed audio transcription API route may be declared");

const redirectLines=redirects.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#"));
const rootRedirectLines=rootRedirects.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#"));
for(const line of rootRedirectLines)assert.equal(redirectLines.includes(line),true,"Published redirects must preserve legacy redirect: "+line);
for(const route of ["/notes / 200","/field-guides / 200","/tools / 200","/ai / 200","/privacy / 200"]){
 assert.equal(redirectLines.includes(route),true,"Published SPA route rewrite missing: "+route);
}
assert.equal(redirectLines.some(line=>/\s\/index\.html\s+200$/.test(line)),false,"SPA rewrites must not target /index.html and create redirect loops");

assert.equal(fs.existsSync("public/404.html"),true,"Published custom 404 boundary must remain present");
assert.equal(fs.existsSync("public/sitemap.xml"),true,"Published sitemap must remain present");
assert.equal(fs.readFileSync("sitemap.xml","utf8"),fs.readFileSync("public/sitemap.xml","utf8"),"Root and published sitemap copies must remain identical");

console.log("Security baseline: PASS");
console.log("Published security headers and CSP: PASS");
console.log("Client-side knowledge AI and reviewed audio transcription Function boundary: PASS");
console.log("SPA routing and legacy redirect policy: PASS");
console.log("Pre-activation AdSense boundary: PASS");
console.log("Published custom 404 and synchronized sitemap: PASS");
