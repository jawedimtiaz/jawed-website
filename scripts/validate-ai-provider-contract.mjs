#!/usr/bin/env node
import assert from "node:assert/strict";
import {generateGroundedReply,DEFAULT_MODEL,FREE_MODEL,MAX_OUTPUT_TOKENS,PROVIDER_TIMEOUT_MS,withProviderTimeout,isSafeSourceUrl} from "../functions/lib/cloudflare-ai-provider.js";

assert.equal(isSafeSourceUrl("/notes/example/"),true);
assert.equal(isSafeSourceUrl("//evil.example/"),false);
assert.equal(isSafeSourceUrl("/\\evil.example/"),false);

const calls=[];
const ai={run:async(model,input)=>{
  calls.push({model,input});
  return {response:"Use [Retirement Planning](https://jawed.co.in/tools/retirement-planning-calculator/)."};
}};
const result=await generateGroundedReply({
  ai,
  input:[{role:"user",content:"Where is the retirement planning calculator?"}],
  sources:[{
    url:"/tools/retirement-planning-calculator/",
    title:"Retirement Planning Calculator",
    summary:"A practical calculator for retirement planning.",
    keywords:["retirement","planning","calculator"]
  }]
});
assert.equal(result.reply.includes("https://jawed.co.in/tools/retirement-planning-calculator/"),true);
assert.equal(result.model,DEFAULT_MODEL);
assert.equal(FREE_MODEL,DEFAULT_MODEL);
assert.equal(calls.length,1);
assert.equal(calls[0].model,DEFAULT_MODEL);
assert.equal(Array.isArray(calls[0].input.messages),true);
assert.equal(calls[0].input.messages[0].role,"system");
assert.equal(calls[0].input.messages[0].content.includes("<UNTRUSTED_CONVERSATION>"),true);
assert.equal(calls[0].input.messages[0].content.includes("<UNTRUSTED_SOURCE_METADATA>"),true);
assert.equal(calls[0].input.messages[1].role,"user");
assert.equal(calls[0].input.max_tokens,MAX_OUTPUT_TOKENS);
assert.equal(calls[0].input.temperature,0.2);

const fallback=await generateGroundedReply({
  ai:{run:async()=>({response:"The calculator can help with retirement planning."})},
  input:[{role:"user",content:"Where is the retirement planning calculator?"}],
  sources:[{url:"/tools/retirement-planning-calculator/",title:"Retirement Planning Calculator",summary:"A practical calculator for retirement planning.",keywords:["retirement","planning","calculator"]}]
});
assert.equal(fallback.reply.includes("Source: [Retirement Planning Calculator](https://jawed.co.in/tools/retirement-planning-calculator/)"),true);

await assert.rejects(
  ()=>generateGroundedReply({ai:null,input:[{role:"user",content:"hello"}],sources:[]}),
  error=>error?.status===503&&error?.category==="PROVIDER_NOT_CONFIGURED"
);

await assert.rejects(
  ()=>generateGroundedReply({ai:{run:async()=>{const e=new Error("daily free allocation reached (3036)");e.status=429;throw e;}},input:[{role:"user",content:"hello"}],sources:[]}),
  error=>error?.status===429&&error?.category==="PROVIDER_HTTP_429"&&error?.providerErrorCode==="3036"
);

await assert.rejects(
  ()=>generateGroundedReply({ai:{run:async()=>({})},input:[{role:"user",content:"hello"}],sources:[]}),
  error=>error?.category==="PROVIDER_INVALID_RESPONSE"
);

assert.equal(PROVIDER_TIMEOUT_MS,30000);
await assert.rejects(
  ()=>withProviderTimeout(new Promise(()=>{}),5),
  error=>error?.status===504&&error?.category==="PROVIDER_TIMEOUT"
);


console.log("Cloudflare AI provider contract behavioral coverage: PASS");
console.log("Workers AI binding invocation contract exercised: yes");
console.log("Grounding and source attribution contract exercised: yes");
console.log("Free-allocation error normalization exercised: yes");
console.log("Missing-binding failure exercised: yes");
console.log("Mocked Workers AI only: yes");
