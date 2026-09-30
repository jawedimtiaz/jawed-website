#!/usr/bin/env node
import assert from "node:assert/strict";
import {findRelevantKnowledge} from "../functions/lib/ai-knowledge.js";
import {buildRetrievalQuery} from "../functions/lib/ai-retrieval.js";

const query=buildRetrievalQuery([
  {role:"user",content:"Tell me about retirement planning."},
  {role:"assistant",content:"Here are some retirement pages."},
  {role:"user",content:"Can you explain the calculator?"}
]);

const results=findRelevantKnowledge(query,5);

assert.equal(results.length>0,true);
assert.equal(results[0].title,"Compound Growth & SIP Calculator");
assert.equal(results.some(entry=>entry.title==="Retirement Planning: Start With the Number"),true);

console.log("AI retrieval relevance weighting OK");
console.log("Current-turn-specific result prioritized: yes");
console.log("Prior user context retained: yes");
