#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("ai/index.html","utf8");
const shared=fs.readFileSync("assets/js/main.js","utf8");

const pageContracts=[
  ["full AI page sends bounded conversation history",page.includes("const MAX_HISTORY=12")&&page.includes(`trimHistory([...history,{role:"user",content:question}])`)],
  ["full AI page preserves the failed question",page.includes("input.value=question")],
  ["full AI page handles configuration failure",page.includes('data?.code==="AI_NOT_CONFIGURED"')],
  ["full AI page handles rate limiting",page.includes('data?.code==="AI_RATE_LIMITED"')],
  ["full AI page handles provider failure",page.includes('data?.code==="AI_PROVIDER_ERROR"')],
  ["full AI page validates source URLs",page.includes('source.url.startsWith("/")')&&page.includes('source.url.startsWith("//")')&&page.includes('source.url.includes("\\\\")')],
  ["full AI page renders assistant output as text",page.includes("p.textContent=text")],
  ["full AI page does not persist chat history",!page.includes("localStorage")&&!page.includes("sessionStorage")]
];

const widgetContracts=[
  ["shared widget sends bounded conversation history",shared.includes("const MAX_HISTORY=12")&&shared.includes("body:JSON.stringify({messages:requestMessages})")],
  ["shared widget preserves the failed question",shared.includes("input.value=question")],
  ["shared widget handles configuration failure",shared.includes('data.code==="AI_NOT_CONFIGURED"')],
  ["shared widget handles rate limiting",shared.includes('data.code==="AI_RATE_LIMITED"')],
  ["shared widget handles provider failure",shared.includes('data.code==="AI_PROVIDER_ERROR"')],
  ["shared widget validates source URLs",shared.includes('s.url.startsWith("/")')&&shared.includes('s.url.startsWith("//")')&&shared.includes('s.url.includes("\\\\")')],
  ["shared widget renders assistant output as text",shared.includes('el.textContent=text')],
  ["shared widget does not persist chat history",!shared.includes("localStorage")&&!shared.includes("sessionStorage")]
];

for(const [name,ok] of [...pageContracts,...widgetContracts]){
  assert.equal(ok,true,name+" contract is missing");
  console.log("PASS — "+name);
}

const parityPairs=[
  ["configuration failure code",page.includes("AI_NOT_CONFIGURED"),shared.includes("AI_NOT_CONFIGURED")],
  ["rate limit code",page.includes("AI_RATE_LIMITED"),shared.includes("AI_RATE_LIMITED")],
  ["provider failure code",page.includes("AI_PROVIDER_ERROR"),shared.includes("AI_PROVIDER_ERROR")],
  ["bounded history",page.includes("const MAX_HISTORY=12"),shared.includes("const MAX_HISTORY=12")],
  ["failed-question preservation",page.includes("input.value=question"),shared.includes("input.value=question")]
];

for(const [name,pageHas,widgetHas] of parityPairs){
  assert.equal(pageHas,true,"Full AI page missing "+name);
  assert.equal(widgetHas,true,"Shared widget missing "+name);
  console.log("PASS — surface parity: "+name);
}

console.log("\nAI surface parity regression validation: PASS");
console.log("Full-page contracts checked:",pageContracts.length);
console.log("Shared-widget contracts checked:",widgetContracts.length);
console.log("Parity pairs checked:",parityPairs.length);
