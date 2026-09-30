#!/usr/bin/env node
import assert from "node:assert/strict";
import {onRequestGet,onRequestPost} from "../functions/api/ai.js";

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

const configuredHealth=await onRequestGet({request:makeRequest("https://jawed.co.in/api/ai"),env:{AI_PROVIDER_API_KEY:"test-key",AI_PROVIDER_MODEL:"test-model"}});
assert.equal(configuredHealth.status,200);
const configuredBody=await configuredHealth.json();
assert.equal(configuredBody.ok,true);
assert.equal(configuredBody.status,"ready");
assert.equal(configuredBody.configuration,"configured");
assert.equal(configuredBody.model,"test-model");

const invalidOrigin=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"origin":"https://evil.example","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"hello"}]})}),
  env:{}
});
assert.equal(invalidOrigin.status,403);
const invalidOriginBody=await invalidOrigin.json();
assert.deepEqual(Object.keys(invalidOriginBody).sort(),["code","error","request_id"]);
assert.equal(invalidOriginBody.code,"AI_ORIGIN_NOT_ALLOWED");
assert.equal(invalidOriginBody.request_id,invalidOrigin.headers.get("x-request-id"));

const uniqueIp="phase-20j-"+Date.now()+"-"+Math.random();
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
// The handler's configured path is exercised with a deterministic provider mock.
globalThis.fetch=async()=>new Response(JSON.stringify({
  model:"mock-handler-model",
  output_text:"See [Retirement Planning](https://jawed.co.in/tools/retirement-planning-calculator/)."
}),{status:200,headers:{"content-type":"application/json"}});

const configuredIp=uniqueIp+"-configured";
const configuredResponse=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{
    method:"POST",
    headers:{"cf-connecting-ip":configuredIp,"content-type":"application/json"},
    body:JSON.stringify({messages:[{role:"user",content:"retirement planning"}]})
  }),
  env:{AI_PROVIDER_API_KEY:"test-key",AI_PROVIDER_MODEL:"test-model"}
});
assert.equal(configuredResponse.status,200);
const configuredResponseBody=await configuredResponse.json();
assert.equal(typeof configuredResponseBody.reply,"string");
assert.equal(configuredResponseBody.reply.length>0,true);
assert.equal(configuredResponseBody.model,"mock-handler-model");
assert.equal(configuredResponseBody.request_id,configuredResponse.headers.get("x-request-id"));
assert.equal(Array.isArray(configuredResponseBody.sources),true);
assert.equal(configuredResponseBody.sources.length>0,true);
assert.equal(configuredResponseBody.reply.includes("https://jawed.co.in/retirement-planning-calculator/"),false);
assert.equal(configuredResponseBody.reply.includes("https://jawed.co.in/tools/retirement-planning-calculator/"),true);
assert.equal(providerCalls,0,"Provider tripwire must remain untouched by mocked configured-path integration.");

globalThis.fetch=async()=>new Response(JSON.stringify({
  error:{message:"mock provider rate limit"}
}),{status:429,headers:{"content-type":"application/json"}});

const providerFailure=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{
    method:"POST",
    headers:{"cf-connecting-ip":configuredIp+"-429","content-type":"application/json"},
    body:JSON.stringify({messages:[{role:"user",content:"retirement planning"}]})
  }),
  env:{AI_PROVIDER_API_KEY:"test-key",AI_PROVIDER_MODEL:"test-model"}
});
assert.equal(providerFailure.status,429);
const providerFailureBody=await providerFailure.json();
assert.equal(providerFailureBody.code,"AI_PROVIDER_ERROR");
assert.equal(providerFailureBody.error,"AI service is temporarily busy. Please try again shortly.");
assert.equal(providerFailureBody.request_id,providerFailure.headers.get("x-request-id"));
assert.deepEqual(Object.keys(providerFailureBody).sort(),["code","error","request_id"]);

globalThis.fetch=async()=>{providerCalls+=1;throw new Error("Provider calls are forbidden in deterministic API handler regression tests.");};
assert.equal(providerCalls,0,"Deterministic handler tests must never call the AI provider.");

console.log("AI API handler behavioral coverage: PASS");
console.log("GET health contract exercised: yes");
console.log("Configured/unconfigured health states exercised: yes");
console.log("POST response headers and payload contracts exercised: yes");
console.log("Configured success and provider-error integration paths exercised: yes");
console.log("Public source shape exercised: yes");
console.log("Live provider call: explicitly blocked: yes");
