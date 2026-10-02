import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("ai/index.html","utf8");
const sharedScript=fs.readFileSync("assets/js/main.js","utf8");
const sharedStyles=fs.readFileSync("assets/css/style.css","utf8");

const required=[
  "data-jawed-ai-widget",
  'fetch("/api/ai",{method:"POST"' ,
  "body:JSON.stringify({messages:requestMessages})",
  "const MAX_HISTORY=12",
  "AI_NOT_CONFIGURED",
  "AI_RATE_LIMITED",
  "AI_PROVIDER_ERROR",
  "jawed-ai-toggle",
  "jawed-ai-panel",
];

for(const marker of required){
  assert.equal(page.includes(marker)||sharedScript.includes(marker),true,"Missing AI live/widget contract marker: "+marker);
}

const widgetRequired=["data-jawed-ai-widget","jawed-ai-toggle","jawed-ai-panel","fetch(\"/api/ai\",{method:\"POST\"","body:JSON.stringify({messages:requestMessages})","AI_NOT_CONFIGURED","AI_RATE_LIMITED","AI_PROVIDER_ERROR","const MAX_HISTORY=12"];
for(const marker of widgetRequired)assert.equal(sharedScript.includes(marker),true,"Missing site-wide AI widget marker: "+marker);
assert.equal(sharedScript.includes('location.pathname.startsWith("/ai/")'),true,"Full AI page must not duplicate the floating widget");
assert.equal(sharedStyles.includes(".jawed-ai-widget"),true,"AI widget styles are missing");

const pageRequired=[
  'fetch("/api/ai"',
  'data?.code==="AI_NOT_CONFIGURED"',
  'data?.code==="AI_PROVIDER_ERROR"',
  'data?.code==="AI_RATE_LIMITED"',
  'const responseText=await res.text()',
  'AI_POST_NON_JSON_RESPONSE',
  'AI_POST_HTTP_',
  'AI_POST_UNEXPECTED_RESPONSE',
  'x-ai-provider-diagnostic',
  'cf-error-type',
  'cf-error-origin',
  'x-ai-handler-diagnostic',
  '/^HANDLER_(?:TYPE_ERROR|SYNTAX_ERROR|UNEXPECTED_ERROR)$/',
  'CLOUDFLARE_ERROR',
  'CF_ERROR_',
  'const MAX_HISTORY=12',
  'p.textContent=text',
  'source.url.startsWith("/")',
  'source.url.startsWith("//")',
  'source.url.includes("\\\\")',
  'maxlength="500"',
 ];

for(const marker of pageRequired){
  assert.equal(page.includes(marker),true,"Missing AI browser contract marker: "+marker);
}

assert.equal(page.includes('body:JSON.stringify({messages:requestMessages})'),true);
assert.equal(page.includes('headers:{"content-type":"application/json","accept":"application/json"}'),true);
assert.equal(page.includes('history=trimHistory([...requestMessages,{role:"assistant",content:data.reply}])'),true);
assert.equal(page.includes('const httpLabel="AI_POST_HTTP_"+res.status'),true);
assert.equal(page.includes('const responseCode=typeof data?.code==="string"?data.code:"AI_POST_UNEXPECTED_RESPONSE"'),true);
assert.equal(page.includes('data={code:"AI_POST_NON_JSON_RESPONSE",diagnostic:res.headers.get("x-ai-provider-diagnostic")||"",handlerDiagnostic:res.headers.get("x-ai-handler-diagnostic")||""}'),true);
assert.equal(page.includes('headerDiagnostic=typeof data?.diagnostic==="string"'),true);
assert.equal(page.includes('const cloudflareType=res.headers.get("cf-error-type")||""'),true);
assert.equal(page.includes('const cloudflareOrigin=res.headers.get("cf-error-origin")||""'),true);
assert.equal(page.includes('handlerDiagnostic:res.headers.get("x-ai-handler-diagnostic")||""'),true);
assert.equal(page.includes('/^HANDLER_(?:TYPE_ERROR|SYNTAX_ERROR|UNEXPECTED_ERROR)$/'),true);
assert.equal(page.includes('if(!data?.code&&cloudflareType)data={...data,code:"CLOUDFLARE_ERROR",cloudflareType,cloudflareOrigin}'),true);
assert.equal(page.includes('/^\\d{3,4}$/'),true);

console.log("AI live operational browser contract validation OK");
console.log("API endpoint wired: yes");
console.log("Provider/configuration failure states handled: yes");
console.log("Rate-limit failure state handled: yes");
console.log("Source URL allowlist boundary present: yes");
console.log("Assistant output rendered as text: yes");
console.log("Conversation history bounded: yes");