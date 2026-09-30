#!/usr/bin/env node
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";

const checks=[
  ["AI knowledge coverage","scripts/validate-ai-knowledge.mjs"],
  ["AI retrieval","scripts/validate-ai-retrieval.mjs"],
  ["AI response/output contract","scripts/validate-ai-response.mjs"],
  ["AI production readiness","scripts/validate-ai-production-readiness.mjs"],
  ["AI live browser contract","scripts/validate-ai-live-operational.mjs"],
  ["AI production observability","scripts/validate-ai-production-observability.mjs"],
  ["AI production security/privacy","scripts/validate-ai-production-security.mjs"]
];

const failures=[];
for(const [name,path] of checks){
  try{
    assert.equal(fs.existsSync(path),true,name+" validator is missing");
    execFileSync(process.execPath,[path],{stdio:"pipe",encoding:"utf8"});
    console.log("PASS — "+name);
  }catch(error){
    failures.push({name,path,output:String(error.stdout||"")+String(error.stderr||error.message||"")});
    console.error("FAIL — "+name);
  }
}

const endpoint=fs.readFileSync("functions/api/ai.js","utf8");
const provider=fs.readFileSync("functions/lib/openai-provider.js","utf8");
const frontend=fs.readFileSync("ai/index.html","utf8");
const rateLimit=fs.readFileSync("functions/lib/ai-rate-limit.js","utf8");

const contracts=[
  ["server request-size boundary",endpoint.includes("MAX_BODY_BYTES=12000")],
  ["server message-count boundary",endpoint.includes("MAX_MESSAGES=12")],
  ["server message-length boundary",endpoint.includes("MAX_MESSAGE_CHARS=2000")],
  ["same-site origin boundary",endpoint.includes("https://jawed.co.in")],
  ["rate-limit boundary",rateLimit.includes("MAX_REQUESTS=8")&&rateLimit.includes("WINDOW_MS=60_000")],
  ["server-side provider credential",provider.includes("authorization:\"Bearer \"+apiKey")],
  ["provider no-storage contract",provider.includes("store:false")],
  ["untrusted conversation boundary",provider.includes("<UNTRUSTED_CONVERSATION>")],
  ["untrusted source boundary",provider.includes("<UNTRUSTED_SOURCE_METADATA>")],
  ["bounded provider output",provider.includes("MAX_REPLY_CHARS=6000")],
  ["source attribution gate",provider.includes("hasAllowedSourceLink")],
  ["external markdown sanitization",provider.includes("sanitizeMarkdownLinks")],
  ["text-only browser rendering",frontend.includes("p.textContent=text")],
  ["structured source URL validation",frontend.includes('source.url.startsWith("/")')&&frontend.includes('source.url.startsWith("//")')],
  ["memory-only browser history",!frontend.includes("localStorage")&&!frontend.includes("sessionStorage")]
];

for(const [name,ok] of contracts){
  try{assert.equal(ok,true,name+" contract is missing");console.log("PASS — "+name);}
  catch(error){failures.push({name,output:error.message});console.error("FAIL — "+name);}
}

if(failures.length){
  console.error("\nAI regression matrix FAILED:");
  for(const failure of failures)console.error("\n"+failure.name+"\n"+failure.output);
  process.exit(1);
}

console.log("\nAI production regression matrix: PASS");
console.log("Validators executed:",checks.length);
console.log("Core contracts checked:",contracts.length);
console.log("Live provider E2E: not asserted by this matrix");
