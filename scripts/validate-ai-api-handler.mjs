#!/usr/bin/env node
import assert from "node:assert/strict";
import {onRequestGet,onRequestPost} from "../functions/api/ai.js";
import {DEFAULT_MODEL,MAX_OUTPUT_TOKENS} from "../functions/lib/cloudflare-ai-provider.js";

const makeRequest=(url,options={})=>new Request(url,options);
let providerCalls=0;
globalThis.fetch=async()=>{providerCalls+=1;throw new Error("Provider calls are forbidden in deterministic API handler regression tests.");};

const health=await onRequestGet({request:makeRequest("https://jawed.co.in/api/ai"),env:{}});
assert.equal(health.status,200);
assert.equal(health.headers.get("cache-control"),"no-store");
assert.equal(health.headers.get("x-content-type-options"),"nosniff");
assert.equal(health.headers.get("x-request-id")?.length>0,true);
const healthBody=await health.json();
assert.equal(healthBody.ok,false);
assert.equal(healthBody.service,"jawed-ai");
assert.equal(healthBody.status,"not_configured");
assert.equal(healthBody.configuration,"not_configured");
assert.equal(typeof healthBody.knowledge_entries,"number");
assert.equal(healthBody.rate_limit.requests,8);
assert.equal(healthBody.rate_limit.window_seconds,60);
assert.equal(healthBody.rate_limit.best_effort,true);
assert.equal(healthBody.request_id,health.headers.get("x-request-id"));

const configuredHealth=await onRequestGet({request:makeRequest("https://jawed.co.in/api/ai"),env:{AI:{run:async()=>({response:"ok"})}}});
assert.equal(configuredHealth.status,200);
const configuredBody=await configuredHealth.json();
assert.equal(configuredBody.ok,true);
assert.equal(configuredBody.status,"ready");
assert.equal(configuredBody.configuration,"configured");
assert.equal(configuredBody.model,DEFAULT_MODEL);

const unexpectedHandlerFailure=await onRequestPost({request:null,env:{}});
assert.equal(unexpectedHandlerFailure.status,502);
const unexpectedHandlerBody=await unexpectedHandlerFailure.json();
assert.equal(unexpectedHandlerBody.code,"AI_HANDLER_ERROR");
assert.equal(unexpectedHandlerBody.diagnostic,"HANDLER_TYPE_ERROR");
assert.equal(unexpectedHandlerFailure.headers.get("x-ai-handler-diagnostic"),"HANDLER_TYPE_ERROR");

const canonicalOrigin=await onRequestPost({
  request:makeRequest("https://www.jawed.co.in/api/ai",{method:"POST",headers:{"origin":"https://www.jawed.co.in","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"retirement planning"}]})}),
  env:{}
});
assert.equal(canonicalOrigin.status,503);
assert.equal((await canonicalOrigin.json()).code,"AI_NOT_CONFIGURED");

const invalidOrigin=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"origin":"https://evil.example","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"asdfgh"}]})}),
  env:{}
});
assert.equal(invalidOrigin.status,403);
const invalidOriginBody=await invalidOrigin.json();
assert.deepEqual(Object.keys(invalidOriginBody).sort(),["code","error","request_id"]);
assert.equal(invalidOriginBody.code,"AI_ORIGIN_NOT_ALLOWED");
assert.equal(invalidOriginBody.request_id,invalidOrigin.headers.get("x-request-id"));

const uniqueIp="phase-26r-"+Date.now()+"-"+Math.random();
const unconfigured=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp,"content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"retirement planning"}]})}),
  env:{}
});
assert.equal(unconfigured.status,503);
const unconfiguredBody=await unconfigured.json();
assert.equal(unconfiguredBody.code,"AI_NOT_CONFIGURED");
assert.equal(Array.isArray(unconfiguredBody.sources),true);
assert.equal(unconfiguredBody.request_id,unconfigured.headers.get("x-request-id"));
assert.equal(unconfigured.headers.get("cache-control"),"no-store");
assert.equal(unconfigured.headers.get("content-type")?.startsWith("application/json"),true);
for(const source of unconfiguredBody.sources){
  assert.equal(typeof source.url,"string");
  assert.equal(source.url.startsWith("/"),true);
  assert.equal(source.url.startsWith("//"),false);
  assert.equal(source.url.includes("\\"),false);
  assert.equal(typeof source.title,"string");
  assert.equal(source.title.trim().length>0,true);
  assert.deepEqual(Object.keys(source).sort(),["title","url"]);
}

const emptyCurrent=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-empty","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"   "}]})}),
  env:{}
});
assert.equal(emptyCurrent.status,400);
assert.equal((await emptyCurrent.json()).code,"AI_INVALID_MESSAGE");
// Safe Workers AI diagnostic mapping is exercised with a synthetic 401-like provider failure.
globalThis.fetch=async()=>{providerCalls+=1;throw new Error("Network provider calls are forbidden.");};
const providerFailure=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-provider","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"retirement planning"}]})}),
  env:{AI:{run:async()=>{const error=new Error("model unavailable");error.status=401;throw error;}}}
});
assert.equal(providerFailure.status,502);
const providerFailureBody=await providerFailure.json();
assert.equal(providerFailureBody.code,"AI_PROVIDER_ERROR");
assert.equal(providerFailureBody.diagnostic,"PROVIDER_HTTP_401");
assert.equal(providerFailureBody.request_id,providerFailure.headers.get("x-request-id"));
assert.equal(providerFailure.headers.get("x-ai-provider-diagnostic"),"PROVIDER_HTTP_401");
assert.equal(Object.prototype.hasOwnProperty.call(providerFailureBody,"message"),false);

let providerRunArgs=null;
const successfulProvider=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-success","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"retirement planning"}]})}),
  env:{AI:{run:async(model,input)=>{providerRunArgs={model,input};return {response:"Test response."};}}}
});
assert.equal(successfulProvider.status,200);
assert.equal(providerRunArgs?.model,DEFAULT_MODEL);
assert.equal(typeof providerRunArgs?.input?.messages?.[0]?.content,"string");
assert.equal(providerRunArgs.input.messages[0].content.includes("Summary:"),true);
assert.equal(providerRunArgs.input.messages[0].content.includes("Keywords:"),true);
assert.equal(providerRunArgs.input.max_tokens,MAX_OUTPUT_TOKENS);
assert.equal(providerRunArgs.input.temperature,0.2);

console.log("AI API handler behavioral coverage: PASS");
console.log("GET health contract exercised: yes");
console.log("Configured/unconfigured health states exercised: yes");
console.log("POST response headers and payload contracts exercised: yes");
console.log("Handler-owned error and health paths exercised: yes");
console.log("Public source shape exercised: yes");
console.log("Live provider call: explicitly blocked: yes");
