#!/usr/bin/env node
import assert from "node:assert/strict";
import {generateGroundedReply,DEFAULT_MODEL,PROVIDER_TIMEOUT_MS,isSafeSourceUrl} from "../functions/lib/openai-provider.js";

assert.equal(isSafeSourceUrl("/notes/example/"),true);
assert.equal(isSafeSourceUrl("//evil.example/"),false);
assert.equal(isSafeSourceUrl("/\\evil.example/"),false);

const originalFetch=globalThis.fetch;
let calls=[];
globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  return new Response(JSON.stringify({
    model:"mock-provider-model",
    output_text:"Use [Retirement Planning](https://jawed.co.in/tools/retirement-planning-calculator/)."
  }),{status:200,headers:{"content-type":"application/json"}});
};

const result=await generateGroundedReply({
  apiKey:"test-provider-key",
  input:[{role:"user",content:"Where is the retirement planning calculator?"}],
  sources:[{
    url:"/tools/retirement-planning-calculator/",
    title:"Retirement Planning Calculator",
    summary:"A practical calculator for retirement planning.",
    keywords:["retirement","planning","calculator"]
  }]
});
assert.equal(result.reply.includes("https://jawed.co.in/tools/retirement-planning-calculator/"),true);
assert.equal(result.model,"mock-provider-model");
assert.equal(calls.length,1);
assert.equal(calls[0].url,"https://api.openai.com/v1/responses");
assert.equal(calls[0].options.method,"POST");
assert.equal(calls[0].options.headers.authorization,"Bearer test-provider-key");
const payload=JSON.parse(calls[0].options.body);
assert.equal(payload.store,false);
assert.equal(payload.model,DEFAULT_MODEL);
assert.equal(payload.max_output_tokens,700);
assert.equal(payload.signal instanceof AbortSignal,true);
assert.equal(PROVIDER_TIMEOUT_MS,30000);
assert.equal(typeof payload.instructions,"string");
assert.equal(payload.instructions.includes("<UNTRUSTED_CONVERSATION>"),true);
assert.equal(payload.instructions.includes("<UNTRUSTED_SOURCE_METADATA>"),true);
assert.equal(payload.input[0].role,"user");

calls=[];
globalThis.fetch=async()=>{calls.push({url:"https://api.openai.com/v1/responses"});return new Response(JSON.stringify({
  model:"mock-error-model",
  error:{message:"provider unavailable"}
}),{status:429,headers:{"content-type":"application/json"}});};
await assert.rejects(
  ()=>generateGroundedReply({apiKey:"test-provider-key",input:[{role:"user",content:"hello"}],sources:[]}),
  error=>error?.status===429
);
assert.equal(calls.length,1);

globalThis.fetch=originalFetch;
console.log("AI provider contract behavioral coverage: PASS");
console.log("Provider request payload exercised: yes");
console.log("No-storage and output-token contracts exercised: yes");
console.log("Provider error status propagation exercised: yes");
console.log("Mocked provider only: yes");
