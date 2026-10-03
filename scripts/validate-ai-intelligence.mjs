#!/usr/bin/env node
import assert from "node:assert/strict";
import {findRelevantKnowledge} from "../functions/lib/ai-knowledge.js";

const cases=[
  ["What's Jawed's job?","/work/experience/"],
  ["What is Jawed's profession?","/about/"],
  ["Where's Jawed's employer?","/work/experience/"],
  ["Tell me about Mac support","/notes/apple-macos-first-response-checklist/"],
  ["What does MDM mean here?","/notes/apple-device-management-enrollment-models/"],
  ["Show me a calculator","/tools/compound-growth-sip-calculator/"],
  ["I need a guide for service desk troubleshooting","/notes/it-service-desk-troubleshooting-workflow/"]
];

for(const [query,expected] of cases){
  const results=findRelevantKnowledge(query,5,{primaryQuery:query});
  assert.equal(results.length>0,true,`Natural-language query returned no sources: ${query}`);
  assert.equal(results[0].url,expected,`Unexpected primary source for: ${query}`);
}

const unrelated=findRelevantKnowledge("zzzxqv quantum banana",5,{primaryQuery:"zzzxqv quantum banana"});
assert.equal(unrelated.length,0);

console.log("AI natural-language intelligence validation: PASS");
console.log("Paraphrase normalization: PASS");
console.log("Domain alias expansion: PASS");
console.log("No-source boundary: PASS");
