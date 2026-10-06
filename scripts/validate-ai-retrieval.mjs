#!/usr/bin/env node
import assert from "node:assert/strict";
import {buildRetrievalQuery,MAX_RETRIEVAL_QUERY_CHARS,PRIOR_USER_TURNS,lastSourcePaths,resolveContextualReference} from "../functions/lib/ai-retrieval.js";
import {findRelevantKnowledge} from "../functions/lib/ai-knowledge.js";

const followUp=buildRetrievalQuery([
  {role:"user",content:"Older retirement context."},
  {role:"assistant",content:"Older assistant context."},
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
assert.equal(followUp.includes("Tell me about the retirement planning tools."),true);
assert.equal(followUp.includes("Older retirement context."),false);
assert.equal(followUp.includes("Here are some retirement-related pages."),false);

const longCurrent="x".repeat(2000);
const longQuery=buildRetrievalQuery([{role:"user",content:"Older user context"},{role:"assistant",content:"Untrusted assistant context"},{role:"user",content:longCurrent}]);
assert.equal(longQuery.length<=MAX_RETRIEVAL_QUERY_CHARS,true);
assert.equal(longQuery.startsWith(longCurrent),true);
assert.equal(PRIOR_USER_TURNS,2);

const topicSwitch=buildRetrievalQuery([{role:"user",content:"Tell me about retirement planning."},{role:"assistant",content:"Here are retirement pages."},{role:"user",content:"What is Jamf?"},{role:"assistant",content:"Jamf is used for Apple device management."},{role:"user",content:"Explain more"}]);
assert.equal(topicSwitch.includes("What is Jamf?"),true);
assert.equal(topicSwitch.includes("Tell me about retirement planning."),false);

const malformedHistory=buildRetrievalQuery([null,{role:"assistant",content:"assistant-only context"},{role:"user",content:""},{role:"user",content:"What is Jamf?"}]);
assert.equal(malformedHistory,"What is Jamf?");
assert.equal(buildRetrievalQuery([null,{},undefined]),"");

const unsafeSourceContext=buildRetrievalQuery([{role:"user",content:"What is Jamf?"},{role:"assistant",content:"See https://jawed.co.in/../secret and https://jawed.co.in/notes/jamf/"},{role:"user",content:"Tell me more about that"}]);
assert.equal(unsafeSourceContext.includes("https://jawed.co.in/../secret"),false);

const sourceMessages=[{role:"user",content:"What is Jamf?"},{role:"assistant",content:"Sources: https://jawed.co.in/notes/jamf/ https://jawed.co.in/work/skills/ https://jawed.co.in/tools/retirement-planning-calculator/ https://jawed.co.in/notes/retirement-planning-start-with-the-number/"}];
assert.equal(lastSourcePaths(sourceMessages,3).length,3);
assert.equal(resolveContextualReference(null,sourceMessages),"");
assert.equal(resolveContextualReference(123,sourceMessages),"");

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
assert.deepEqual(findRelevantKnowledge(null),[]);
assert.deepEqual(findRelevantKnowledge(undefined),[]);
assert.deepEqual(findRelevantKnowledge(123),[]);
assert.deepEqual(findRelevantKnowledge("retirement planning",null).length>0,true);
assert.deepEqual(findRelevantKnowledge("retirement planning",0),[]);
assert.deepEqual(findRelevantKnowledge("retirement planning",-1),[]);
assert.deepEqual(findRelevantKnowledge("retirement planning",99).length<=10,true);
assert.deepEqual(findRelevantKnowledge("retirement planning",{primaryQuery:"retirement planning"}).length>0,true);
assert.deepEqual(findRelevantKnowledge("retirement planning",{primaryQuery:123}).length>0,true);
assert.deepEqual(findRelevantKnowledge("retirement planning",{primaryQuery:""}).length>0,true);

const vague=urls("tell me more",{primaryQuery:"retirement planning"});
assert.equal(vague.length>0,true);
assert.equal(vague.includes("/notes/retirement-planning-start-with-the-number/"),true);

console.log("AI retrieval context validation OK");
console.log("Knowledge malformed-input boundary: yes");
console.log("Current user turns prioritized: yes");
console.log("Prior user turns included:",PRIOR_USER_TURNS);
console.log("Assistant turns excluded: yes");
console.log("Malformed history boundary: yes");
console.log("Unsafe source context rejected: yes");
console.log("Source-path limit boundary: yes");
console.log("Context reference type boundary: yes");
console.log("Query character cap:",MAX_RETRIEVAL_QUERY_CHARS);
console.log("Knowledge ranking precision: yes");
console.log("Vague follow-up topic boundary: yes");
