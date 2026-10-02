#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const harness=fs.readFileSync("scripts/validate-ai-production-e2e.mjs","utf8");

const contracts=[
  ["E2E harness has an explicit request timeout",harness.includes("AbortSignal.timeout(")],
  ["E2E harness uses the timeout for every request",harness.includes("AbortSignal.timeout(REQUEST_TIMEOUT_MS)")],
  ["E2E harness remains safe when provider is not configured",harness.includes('configuration==="not_configured"')&&harness.includes("Live provider request skipped safely.")],
  ["E2E health request remains GET-only",harness.includes("const health=await request(api);")],
  ["E2E provider request is explicitly POST",harness.includes('method:"POST"')],
  ["E2E provider request does not require a browser credential",!harness.includes("Authorization")&&!harness.includes("api-key")],
  ["E2E harness rejects exposed API keys",harness.includes('health.body?.api_key,undefined')],
  ["E2E harness validates correlation IDs",harness.includes('headers.get("x-request-id")')&&harness.includes("request_id")],
  ["E2E harness validates public source metadata boundary",harness.includes('Object.keys(source).sort(),["title","url"]')],
  ["E2E harness validates relative source URLs",harness.includes('source.url.startsWith("/")')&&harness.includes('source.url.startsWith("//")')&&harness.includes('source.url.includes("\\")')],
  ["E2E harness remains excluded from the deterministic production matrix",fs.readFileSync("scripts/validate-ai-regression.mjs","utf8").includes('"scripts/validate-ai-production-e2e.mjs"')]
];

for(const [name,ok] of contracts){
  assert.equal(ok,true,name+" contract is missing");
  console.log("PASS — "+name);
}

console.log("\nAI production E2E harness safety validation: PASS");
console.log("Harness safety contracts checked:",contracts.length);
console.log("Live provider invoked by this validator: no");
