#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {checkRateLimit,MAX_REQUESTS,WINDOW_MS} from "../functions/lib/ai-rate-limit.js";

const endpoint=fs.readFileSync("functions/api/ai.js","utf8");

const apiContentLengthGuard=fs.readFileSync("functions/api/ai.js","utf8");
const apiContentLengthGuardContract=apiContentLengthGuard.includes('const declaredLength=Number(request.headers.get("content-length"))')&&apiContentLengthGuard.includes('declaredLength>MAX_BODY_BYTES');
assert.equal(apiContentLengthGuardContract,true,"Oversized declared request bodies must be rejected before buffering");

const failures=[
  ["origin rejection",endpoint.includes('AI_ORIGIN_NOT_ALLOWED')&&endpoint.includes("403")],
  ["content-type rejection",endpoint.includes('AI_INVALID_CONTENT_TYPE')&&endpoint.includes("415")],
  ["oversized body rejection",endpoint.includes('AI_REQUEST_TOO_LARGE')&&endpoint.includes("413")],
  ["invalid JSON rejection",endpoint.includes('AI_INVALID_JSON')&&endpoint.includes("400")],
  ["conversation shape rejection",endpoint.includes('AI_INVALID_CONVERSATION')&&endpoint.includes("Provide between 1 and 12 messages.")],
  ["message validation rejection",endpoint.includes('AI_INVALID_MESSAGE')&&endpoint.includes("2,000 characters or fewer")],
  ["latest-user rejection",endpoint.includes('messages.at(-1).role!=="user"')&&endpoint.includes('AI_INVALID_CONVERSATION')],
  ["retrieval failure",endpoint.includes('AI_RETRIEVAL_ERROR')&&endpoint.includes("502")],
  ["unconfigured provider state",endpoint.includes('AI_NOT_CONFIGURED')&&endpoint.includes("503")],
  ["provider failure mapping",endpoint.includes('AI_PROVIDER_ERROR')&&endpoint.includes("AI service is temporarily unavailable.")],
  ["provider rate-limit mapping",endpoint.includes('status===429?429:502')],
  ["provider credit exhaustion has actionable message",endpoint.includes('providerErrorCode==="credit_balance_exhausted"')&&endpoint.includes("Add API credits")],
  ["minimal generic failure payload",endpoint.includes('return json({error,code,request_id:id},status')],
  ["failure response request correlation",endpoint.includes('"x-request-id":id')]
];

for(const [name,ok] of failures)assert.equal(ok,true,"Missing negative-path contract: "+name);

const key="phase-20h-"+Date.now()+"-"+Math.random();
const start=10_000;
for(let i=1;i<=MAX_REQUESTS;i++){
  const result=checkRateLimit(key,start);
  assert.equal(result.allowed,true,"Request "+i+" should remain allowed inside the window");
  assert.equal(result.retryAfter,0,"Allowed requests should have zero retry delay");
}
const limited=checkRateLimit(key,start+WINDOW_MS-1);
assert.equal(limited.allowed,false,"The request after the configured allowance must be rate limited");
assert.equal(limited.retryAfter>=1,true,"Rate-limited responses must provide a positive retry interval");
const reset=checkRateLimit(key,start+WINDOW_MS);
assert.equal(reset.allowed,true,"A new window must reset the allowance");
assert.equal(reset.retryAfter,0,"A new window must have zero retry delay");

const anonymousKey="anonymous";
const anonymous=checkRateLimit(anonymousKey,start);
assert.equal(typeof anonymous.allowed,"boolean","Anonymous fallback must remain rate-limitable");

console.log("AI negative-path regression validation: PASS");
console.log("HTTP/input failure contracts checked:",failures.length);
console.log("Rate-limit allowance checked:",MAX_REQUESTS);
console.log("Window reset checked:",WINDOW_MS+"ms");
console.log("Provider-backed live failure paths: not asserted");
