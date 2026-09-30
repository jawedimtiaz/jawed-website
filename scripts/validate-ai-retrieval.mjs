#!/usr/bin/env node
import assert from "node:assert/strict";
import {buildRetrievalQuery,MAX_RETRIEVAL_QUERY_CHARS,PRIOR_USER_TURNS} from "../functions/lib/ai-retrieval.js";

const followUp=buildRetrievalQuery([
  {role:"user",content:"Older retirement context."},
  {role:"assistant",content:"Older assistant context."},
  {role:"user",content:"Tell me about the retirement planning tools."},
  {role:"assistant",content:"Here are some retirement-related pages."},
  {role:"user",content:"Which one covers withdrawal planning?"},
  {role:"assistant",content:"The previous answer discussed a retirement note."},
  {role:"user",content:"Can you explain more about that?"}
]);

assert.equal(followUp.includes("Can you explain more about that?"),true);
assert.equal(followUp.includes("Which one covers withdrawal planning?"),true);
assert.equal(followUp.includes("Tell me about the retirement planning tools."),true);\nassert.equal(followUp.includes("Older retirement context."),false);
assert.equal(followUp.includes("Here are some retirement-related pages."),false);

const longCurrent="x".repeat(2000);
const longQuery=buildRetrievalQuery([
  {role:"user",content:"Older user context"},
  {role:"assistant",content:"Untrusted assistant context"},
  {role:"user",content:longCurrent}
]);
assert.equal(longQuery.length<=MAX_RETRIEVAL_QUERY_CHARS,true);
assert.equal(longQuery.startsWith(longCurrent),true);
assert.equal(PRIOR_USER_TURNS,2);


import {findRelevantKnowledge} from "../functions/lib/ai-knowledge.js";

const urls=(query,options={})=>findRelevantKnowledge(query,5,options).map(entry=>entry.url);

const retirement=urls("retirement planning");
assert.equal(retirement[0],"/tools/retirement-planning-calculator/");
assert.equal(retirement.includes("/notes/retirement-planning-start-with-the-number/"),true);
assert.equal(retirement.includes("/notes/retirement-corpus-calculation-framework/"),true);

const tax=urls("Indian income tax");
assert.equal(tax[0],"/notes/indian-income-tax-practical-starting-point/");
assert.equal(tax.includes("/notes/new-vs-old-tax-regime-comparison/"),true);

const jamf=urls("Jamf device management");
assert.equal(jamf[0],"/notes/apple-device-management-enrollment-models/");
assert.equal(jamf.includes("/work/skills/"),true);

const aiTools=urls("AI tools");
assert.equal(aiTools[0],"/notes/choosing-ai-tools-privacy-cost-fit/");
assert.equal(aiTools.includes("/tools/ai-prompt-builder/"),true);

assert.deepEqual(urls("asdfgh"),[]);
assert.deepEqual(urls("asdfgh",{primaryQuery:"asdfgh"}),[]);

const vague=urls("tell me more",{primaryQuery:"retirement planning"});
assert.equal(vague.length>0,true);
assert.equal(vague.includes("/notes/retirement-planning-start-with-the-number/"),true);

console.log("AI retrieval context validation OK");
console.log("Current user turns prioritized: yes");
console.log("Prior user turns included:",PRIOR_USER_TURNS);
console.log("Assistant turns excluded: yes");
console.log("Query character cap:",MAX_RETRIEVAL_QUERY_CHARS);
console.log("Knowledge ranking precision: yes");
