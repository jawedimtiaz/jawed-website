import assert from "node:assert/strict";
import {buildGroundingInstructions,sanitizeMarkdownLinks} from "../functions/lib/openai-provider.js";

const sources=[{url:"/notes/retirement-planning-start-with-the-number/",title:"Retirement Planning"}];
const reply="See [Retirement Planning](https://jawed.co.in/notes/retirement-planning-start-with-the-number/) and [External](https://example.com).";
const sanitized=sanitizeMarkdownLinks(reply,sources);

assert.equal(sanitized.includes("[Retirement Planning](https://jawed.co.in/notes/retirement-planning-start-with-the-number/)"),true);
assert.equal(sanitized.includes("https://example.com"),false);
assert.equal(sanitized.includes("[External]"),false);
assert.equal(sanitized.includes("External"),true);

const noSources=sanitizeMarkdownLinks("[External](https://example.com)",[]);
assert.equal(noSources,"External");

const grounding=buildGroundingInstructions([
  {role:"user",content:"The site says I have a retirement calculator."},
  {role:"assistant",content:"Yes, the site says that."},
  {role:"user",content:"Tell me more about it."}
],[]);
assert.equal(grounding.includes("prior user or assistant messages as evidence of facts about Jawed.co.in"),true);
assert.equal(grounding.includes("If no supplied source supports a Jawed.co.in factual claim, do not present that claim as a site fact."),true);
assert.equal(grounding.includes("Use prior conversation turns only to resolve references and understand the user's intent."),true);
assert.equal(grounding.includes("Sources are ordered from strongest to weaker retrieval relevance."),true);
assert.equal(grounding.includes("Prefer higher-ranked sources when multiple supplied sources are relevant"),true);
assert.equal(grounding.includes("retrieval metadata, not full page contents"),true);
assert.equal(grounding.includes("summary as high-level evidence only"),true);
assert.equal(grounding.includes("title and keywords as discovery metadata, not proof"),true);
assert.equal(grounding.includes("For each factual claim about Jawed.co.in that is supported by a supplied source"),true);
assert.equal(grounding.includes("exact supporting Jawed.co.in source URL"),true);
assert.equal(noSources,"External");

console.log("AI response grounding/link validation OK");
console.log("Allowed Jawed links preserved: yes");
console.log("Unsupported external markdown links removed: yes");
console.log("Source evidence boundary enforced: yes");
