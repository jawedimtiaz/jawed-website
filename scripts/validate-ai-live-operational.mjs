import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("ai/index.html","utf8");

const required=[
  'fetch("/api/ai"',
  'data?.code==="AI_NOT_CONFIGURED"',
  'data?.code==="AI_PROVIDER_ERROR"',
  'data?.code==="AI_RATE_LIMITED"',
  'const responseText=await res.text()',
  'AI_POST_NON_JSON_RESPONSE',
  'AI_POST_HTTP_',
  'AI_POST_UNEXPECTED_RESPONSE',
  'const MAX_HISTORY=12',
  'p.textContent=text',
  'source.url.startsWith("/")',
  'source.url.startsWith("//")',
  'source.url.includes("\\\\")',
  'maxlength="500"',
];

for(const marker of required){
  assert.equal(page.includes(marker),true,"Missing AI browser contract marker: "+marker);
}

assert.equal(page.includes('body:JSON.stringify({messages:requestMessages})'),true);
assert.equal(page.includes('headers:{"content-type":"application/json","accept":"application/json"}'),true);
assert.equal(page.includes('history=trimHistory([...requestMessages,{role:"assistant",content:data.reply}])'),true);
assert.equal(page.includes('const httpLabel="AI_POST_HTTP_"+res.status'),true);
assert.equal(page.includes('const responseCode=typeof data?.code==="string"?data.code:"AI_POST_UNEXPECTED_RESPONSE"'),true);
assert.equal(page.includes('data={code:"AI_POST_NON_JSON_RESPONSE"}'),true);

console.log("AI live operational browser contract validation OK");
console.log("API endpoint wired: yes");
console.log("Provider/configuration failure states handled: yes");
console.log("Rate-limit failure state handled: yes");
console.log("Source URL allowlist boundary present: yes");
console.log("Assistant output rendered as text: yes");
console.log("Conversation history bounded: yes");