#!/usr/bin/env node
import assert from "node:assert/strict";
import {onRequestGet,onRequestPost} from "../functions/api/ai.js";
import {buildRetrievalQuery,lastSourcePaths,MAX_RETRIEVAL_QUERY_CHARS} from "../functions/lib/ai-retrieval.js";
import {DEFAULT_MODEL,MAX_OUTPUT_TOKENS,PROVIDER_TEMPERATURE} from "../functions/lib/cloudflare-ai-provider.js";
import {isSafeSourceUrl,isSafeSourceMetadata,MAX_SOURCE_TITLE_CHARS,MAX_SOURCE_SUMMARY_CHARS,MAX_SOURCE_KEYWORD_CHARS,MAX_SOURCE_KEYWORDS,MAX_REPLY_CHARS} from "../functions/lib/ai-provider-common.js";
import {MAX_REQUESTS,WINDOW_MS} from "../functions/lib/ai-rate-limit.js";

const makeRequest=(url,options={})=>new Request(url,options);
let providerCalls=0;
globalThis.fetch=async()=>{providerCalls+=1;throw new Error("Provider calls are forbidden in deterministic API handler regression tests.");};

const validSource={url:"/notes/example/",title:"Example",summary:"A bounded source summary.",keywords:["example"]};
assert.equal(isSafeSourceMetadata(validSource),true);
assert.equal(isSafeSourceMetadata({...validSource,title:"x".repeat(MAX_SOURCE_TITLE_CHARS+1)}),false);
assert.equal(isSafeSourceMetadata({...validSource,summary:"x".repeat(MAX_SOURCE_SUMMARY_CHARS+1)}),false);
assert.equal(isSafeSourceMetadata({...validSource,keywords:["x".repeat(MAX_SOURCE_KEYWORD_CHARS+1)]}),false);
assert.equal(isSafeSourceMetadata({...validSource,keywords:Array.from({length:MAX_SOURCE_KEYWORDS+1},()=> "x")}),false);
assert.equal(isSafeSourceMetadata({...validSource,title:"safe\u0007title"}),false);

const contextualMessages=[
  {role:"user",content:"Who is Jawed?"},
  {role:"assistant",content:"Jawed is described here: https://jawed.co.in/about/."},
  {role:"user",content:"Tell me more about that"}
];
const contextualQuery=buildRetrievalQuery(contextualMessages);
assert.equal(contextualQuery.includes("Previous source context: /about/"),true);
assert.equal(lastSourcePaths([{role:"assistant",content:"Source: https://jawed.co.in/about/"}],3)[0],"/about/");
const unsafeContextMessages=[
  {role:"user",content:"Tell me about Jawed"},
  {role:"assistant",content:"Source: https://jawed.co.in/notes/%2e%2e%2fadmin/"},
  {role:"user",content:"Tell me more about that"}
];
assert.deepEqual(lastSourcePaths(unsafeContextMessages,3),[]);
assert.equal(buildRetrievalQuery(unsafeContextMessages).includes("Previous source context:"),false);
const assistantOnlyIdentityMessages=[
  {role:"assistant",content:"This is information about Jawed."},
  {role:"user",content:"What does he do?"}
];
assert.equal(buildRetrievalQuery(assistantOnlyIdentityMessages).includes("Jawed"),false);
const nonUserIdentityMessages=[
  {role:"system",content:"Jawed is the subject."},
  {role:"user",content:"What does he do?"}
];
assert.equal(buildRetrievalQuery(nonUserIdentityMessages).includes("Jawed"),false);
assert.equal(buildRetrievalQuery([{role:"user",content:"x".repeat(MAX_RETRIEVAL_QUERY_CHARS+500)}]).length,MAX_RETRIEVAL_QUERY_CHARS);

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
assert.equal(healthBody.rate_limit.requests,MAX_REQUESTS);
assert.equal(healthBody.rate_limit.window_seconds,WINDOW_MS/1000);
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
assert.equal(unconfiguredBody.sources.every(source=>Object.keys(source).sort().join(",")==="title,url"),true);
assert.equal(new Set(unconfiguredBody.sources.map(source=>source.url)).size,unconfiguredBody.sources.length);
assert.equal(unconfiguredBody.sources.length<=5,true);
for(const source of unconfiguredBody.sources){
  assert.equal(typeof source.url,"string");
  assert.equal(isSafeSourceUrl(source.url),true);
  assert.equal(typeof source.title,"string");
  assert.equal(source.title.trim().length>0,true);
  assert.deepEqual(Object.keys(source).sort(),["title","url"]);
}

const deterministicIdentity=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-identity","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"Who is Jawed?"}]})}),
  env:{}
});
assert.equal(deterministicIdentity.status,200);
const deterministicIdentityBody=await deterministicIdentity.json();
assert.equal(deterministicIdentityBody.model,"deterministic-site-intent");
assert.equal(deterministicIdentityBody.sources.length,1);
assert.equal(deterministicIdentityBody.sources[0].url,"/about/");
assert.equal(deterministicIdentityBody.reply.includes("https://jawed.co.in/about/"),true);

const deterministicWork=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-work","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"Where does Jawed work?"}]})}),
  env:{}
});
assert.equal(deterministicWork.status,200);
const deterministicWorkBody=await deterministicWork.json();
assert.equal(deterministicWorkBody.model,"deterministic-site-intent");
assert.equal(deterministicWorkBody.sources.length,1);
assert.equal(deterministicWorkBody.sources[0].url,"/work/experience/");
assert.equal(deterministicWorkBody.reply.includes("https://jawed.co.in/work/experience/"),true);

const nonDeterministicIdentity=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-identity-detail","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"Tell me more about Jawed's projects"}]})}),
  env:{}
});
assert.equal(nonDeterministicIdentity.status,503);
assert.equal((await nonDeterministicIdentity.json()).code,"AI_NOT_CONFIGURED");

const deterministicClosing=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-closing","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"Thanks!"}]})}),
  env:{}
});
assert.equal(deterministicClosing.status,200);
const deterministicClosingBody=await deterministicClosing.json();
assert.equal(deterministicClosingBody.model,"deterministic-site-intent");
assert.equal(deterministicClosingBody.sources.length,0);
assert.equal(deterministicClosingBody.reply,"Goodbye! 👋");

const emptyCurrent=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-empty","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"   "}]})}),
  env:{}
});
assert.equal(emptyCurrent.status,400);
assert.equal((await emptyCurrent.json()).code,"AI_INVALID_MESSAGE");
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

const oversizedProvider=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-oversized","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"retirement planning"}]})}),
  env:{AI:{run:async()=>({response:"x".repeat(MAX_REPLY_CHARS+1)})}}
});
assert.equal(oversizedProvider.status,502);
const oversizedProviderBody=await oversizedProvider.json();
assert.equal(oversizedProviderBody.code,"AI_PROVIDER_ERROR");
assert.equal(oversizedProviderBody.diagnostic,"PROVIDER_RESPONSE_VALIDATION");
assert.equal(oversizedProvider.headers.get("x-ai-provider-diagnostic"),"PROVIDER_RESPONSE_VALIDATION");

const controlCharacterProvider=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-control","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"retirement planning"}]})}),
  env:{AI:{run:async()=>({response:"unsafe\\u0007response"})}}
});
assert.equal(controlCharacterProvider.status,502);
const controlCharacterBody=await controlCharacterProvider.json();
assert.equal(controlCharacterBody.code,"AI_PROVIDER_ERROR");
assert.equal(controlCharacterBody.diagnostic,"PROVIDER_RESPONSE_VALIDATION");

let providerRunArgs=null;
const successfulProvider=await onRequestPost({
  request:makeRequest("https://jawed.co.in/api/ai",{method:"POST",headers:{"cf-connecting-ip":uniqueIp+"-success","content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:"retirement planning"}]})}),
  env:{AI:{run:async(model,input)=>{providerRunArgs={model,input};return {response:"Test response with [unsafe link](https://evil.example/phish)."};}}}
});
assert.equal(successfulProvider.status,200);
assert.equal(providerRunArgs?.model,DEFAULT_MODEL);
assert.equal(typeof providerRunArgs?.input?.messages?.[0]?.content,"string");
assert.equal(providerRunArgs.input.messages[0].content.includes("Summary:"),true);
assert.equal(providerRunArgs.input.messages[0].content.includes("Keywords:"),true);
assert.equal(providerRunArgs.input.messages[0].content.includes("Evidence level: summary metadata only"),true);
assert.equal(providerRunArgs.input.max_tokens,MAX_OUTPUT_TOKENS);
assert.equal(providerRunArgs.input.temperature,PROVIDER_TEMPERATURE);
const successfulProviderBody=await successfulProvider.json();
assert.equal(successfulProviderBody.reply.includes("https://jawed.co.in"),true);
assert.equal(successfulProviderBody.sources.length<=5,true);
assert.equal(successfulProviderBody.reply.includes("https://evil.example"),false);
assert.equal(successfulProviderBody.reply.includes("https://jawed.co.in"),true);

console.log("AI API handler behavioral coverage: PASS");
console.log("GET health contract exercised: yes");
console.log("Configured/unconfigured health states exercised: yes");
console.log("POST response headers and payload contracts exercised: yes");
console.log("Handler-owned error and health paths exercised: yes");
console.log("Public source shape exercised: yes");
console.log("Contextual retrieval source-path safety exercised: yes");
console.log("Identity context is user-message scoped: yes");
console.log("Non-user role context boundary exercised: yes");
console.log("Live provider call: explicitly blocked: yes");
