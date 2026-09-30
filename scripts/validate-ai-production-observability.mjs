#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const endpoint=fs.readFileSync("functions/api/ai.js","utf8");
const docs=fs.readFileSync("docs/ai-production-observability.md","utf8");

for(const token of [
  "crypto.randomUUID()",
  'event:"ai_request_failure"',
  'event:"ai_request_unconfigured"',
  'event:"ai_request_success"',
  '"AI_RETRIEVAL_ERROR"',
  '"AI_PROVIDER_ERROR"',
  '"AI_NOT_CONFIGURED"',
  "request_id:id",
  '"x-request-id":id'
])assert.equal(endpoint.includes(token),true,"Missing observability contract: "+token);

assert.equal(endpoint.includes("apiKey"),true,"Provider credential boundary should remain server-side");
const logLines=endpoint.split("\n").filter(line=>line.includes("console."));
for(const forbidden of ["messages","apiKey","authorization","summary","content"]){
  assert.equal(logLines.some(line=>line.includes(forbidden)),false,"Runtime logs must not include "+forbidden);
}
assert.equal(docs.includes("API keys"),true,"Observability docs must state credential exclusion");
assert.equal(docs.includes("user messages"),true,"Observability docs must state user-content exclusion");
assert.equal(docs.includes("source summaries"),true,"Observability docs must state retrieval-metadata exclusion");

console.log("AI production observability contract: PASS");
