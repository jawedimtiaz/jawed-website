#!/usr/bin/env node
import assert from "node:assert/strict";

const base=(process.argv[2]||"https://jawed.co.in").replace(/\/$/,"");
const api=base+"/api/ai";
const REQUEST_TIMEOUT_MS=10_000;

async function request(url,options){
  const response=await fetch(url,{...options,signal:options?.signal||AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
  const text=await response.text();
  let body=null;
  try{body=JSON.parse(text)}catch{}
  return {response,body,text};
}

const health=await request(api);
assert.equal(health.response.ok||health.response.status===503,true,"Unexpected AI health HTTP status: "+health.response.status);
assert.equal(health.body?.service,"jawed-ai","AI health response did not identify jawed-ai");
assert.equal(["ready","not_configured"].includes(health.body?.status),true,"Unexpected AI health status");
assert.equal(["configured","not_configured"].includes(health.body?.configuration),true,"Unexpected AI configuration state");
assert.equal(typeof health.body?.knowledge_entries,"number",true,"AI health response missing knowledge count");
assert.equal(health.body?.api_key,undefined,"Health response must never expose an API key");
assert.equal(typeof health.response.headers.get("x-request-id"),"string","AI health response must expose a request correlation ID");
assert.equal(health.response.headers.get("x-request-id").length>0,true,"AI health request correlation ID must be non-empty");
assert.equal(health.body?.request_id,health.response.headers.get("x-request-id"),"AI health request ID must match its response header");

if(health.body?.configuration==="not_configured"){
  console.log("AI production E2E harness: deployment reachable, provider not configured.");
  console.log("Live provider request skipped safely.");
  process.exit(0);
}

const result=await request(api,{
  method:"POST",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({messages:[{role:"user",content:"Where can I explore retirement planning on Jawed.co.in?"}]})
});

assert.equal(result.response.status,200,"Expected successful provider response, got HTTP "+result.response.status);
assert.equal(typeof result.response.headers.get("x-request-id"),"string","AI provider response must expose a request correlation ID");
assert.equal(result.body?.request_id,result.response.headers.get("x-request-id"),"AI provider request ID must match its response header");
assert.equal(typeof result.body?.reply,"string","AI response missing reply");
assert.equal(result.body.reply.length>0,true,"AI response reply is empty");
assert.equal(Array.isArray(result.body?.sources),true,"AI response missing structured sources");
assert.equal(typeof result.body?.model,"string","AI response must identify the provider model");

for(const source of result.body.sources){
  assert.equal(typeof source?.url,"string","AI source URL must be a string");
  assert.equal(source.url.startsWith("/"),true,"AI source URL must be relative");
  assert.equal(source.url.startsWith("//"),false,"AI source URL must not be protocol-relative");
  assert.equal(source.url.includes("\\"),false,"AI source URL must not contain backslashes");
  assert.equal(typeof source?.title,"string","AI source title must be a string");
  assert.equal(source.title.trim().length>0,true,"AI source title must be non-empty");
  assert.deepEqual(Object.keys(source).sort(),["title","url"],"AI public source metadata must expose only url and title");
}

console.log("AI production E2E smoke test: PASS");
console.log("Provider-backed response: yes");
console.log("Structured source contract: yes");
console.log("Provider model contract: yes");
console.log("API key exposed: no");
