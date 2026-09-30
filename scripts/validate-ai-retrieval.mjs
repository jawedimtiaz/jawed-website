#!/usr/bin/env node
import assert from "node:assert/strict";
import {buildRetrievalQuery,MAX_RETRIEVAL_QUERY_CHARS,PRIOR_USER_TURNS} from "../functions/lib/ai-retrieval.js";

const followUp=buildRetrievalQuery([
  {role:"user",content:"Tell me about the retirement planning tools."},
  {role:"assistant",content:"Here are some retirement-related pages."},
  {role:"user",content:"Which one covers withdrawal planning?"},
  {role:"assistant",content:"The previous answer discussed a retirement note."},
  {role:"user",content:"Can you explain more about that?"}
]);

assert.equal(followUp.includes("Can you explain more about that?"),true);
assert.equal(followUp.includes("Which one covers withdrawal planning?"),true);
assert.equal(followUp.includes("Tell me about the retirement planning tools."),false);
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

console.log("AI retrieval context validation OK");
console.log("Current user turns prioritized: yes");
console.log("Prior user turns included:",PRIOR_USER_TURNS);
console.log("Assistant turns excluded: yes");
console.log("Query character cap:",MAX_RETRIEVAL_QUERY_CHARS);
