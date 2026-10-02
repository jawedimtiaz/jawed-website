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

assert.equal(endpoint.includes("env.AI"),true,"Workers AI binding must remain server-side");
assert.equal(endpoint.includes("AI_PROVIDER_API_KEY"),false,"Production observability must not depend on an OpenAI API key");
assert.equal(endpoint.includes("api.openai.com"),false,"Production observability must not depend on the OpenAI API");
assert.equal(endpoint.includes("provider_category:diagnostic"),true,"Provider telemetry must use the normalized diagnostic category");
assert.equal(endpoint.includes("provider_body_bytes:Number.isInteger(error?.providerBodyBytes)?error.providerBodyBytes:null"),true,"Provider telemetry must record only bounded body size");
assert.equal(endpoint.includes("provider_error_code:typeof error?.providerErrorCode==="string"?error.providerErrorCode:"""),true,"Provider telemetry may record only the normalized provider error code");
assert.equal(endpoint.includes("provider_retry_after_seconds:Number.isInteger(error?.providerRetryAfterSeconds)?error.providerRetryAfterSeconds:null"),true,"Provider retry timing must remain numeric telemetry only");
assert.equal(endpoint.includes("provider_body_bytes"),true,"Provider telemetry must not expose provider response bodies");
const logLines=endpoint.split("\n").filter(line=>line.includes("console."));
for(const forbidden of ["messages","apiKey","authorization","summary"]){
  assert.equal(logLines.some(line=>line.includes(forbidden)),false,"Runtime logs must not include "+forbidden);
}
assert.equal(docs.includes("API keys"),true,"Observability docs must state that no provider API key is required");
assert.equal(docs.includes("user messages"),true,"Observability docs must state user-content exclusion");
assert.equal(docs.includes("source summaries"),true,"Observability docs must state retrieval-metadata exclusion");

console.log("AI production observability contract: PASS");
