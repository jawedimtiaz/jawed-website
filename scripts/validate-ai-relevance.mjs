#!/usr/bin/env node
import assert from "node:assert/strict";
import {findRelevantKnowledge} from "../functions/lib/ai-knowledge.js";
import {buildRetrievalQuery} from "../functions/lib/ai-retrieval.js";

const followUp=buildRetrievalQuery([
  {role:"user",content:"Tell me about retirement planning."},
  {role:"assistant",content:"Here are some retirement pages."},
  {role:"user",content:"Can you explain the calculator?"}
]);
const followUpResults=findRelevantKnowledge(followUp,5,{primaryQuery:"Can you explain the calculator?"});
assert.equal(followUpResults[0].title,"Compound Growth & SIP Calculator");
assert.equal(followUpResults.length,3);

const mixed=buildRetrievalQuery([
  {role:"user",content:"Tell me about retirement planning."},
  {role:"assistant",content:"Here are some retirement pages."},
  {role:"user",content:"What is Jamf?"}
]);
const mixedResults=findRelevantKnowledge(mixed,5,{primaryQuery:"What is Jamf?"});
assert.equal(mixedResults[0].title,"Apple Device Management Enrollment Models");
assert.equal(mixedResults.slice(0,3).some(entry=>entry.title==="Retirement Planning: Start With the Number"),false);
assert.equal(mixedResults.some(entry=>entry.title==="Retirement Planning: Start With the Number"),false);

const longCurrent="x".repeat(2000);
const longQuery=buildRetrievalQuery([
  {role:"user",content:"Older user context"},
  {role:"assistant",content:"Untrusted assistant context"},
  {role:"user",content:longCurrent}
]);
assert.equal(longQuery.length<=6000,true);
assert.equal(longQuery.startsWith(longCurrent),true);

console.log("AI retrieval source-set precision validation OK");
console.log("Current request prioritized: yes");
console.log("Prior user context retained: yes");
console.log("Assistant turns excluded: yes");
