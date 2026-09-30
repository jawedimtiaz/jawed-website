import assert from "node:assert/strict";
import {sanitizeMarkdownLinks} from "../functions/lib/openai-provider.js";

const sources=[{url:"/notes/retirement-planning-start-with-the-number/",title:"Retirement Planning"}];
const reply="See [Retirement Planning](https://jawed.co.in/notes/retirement-planning-start-with-the-number/) and [External](https://example.com).";
const sanitized=sanitizeMarkdownLinks(reply,sources);

assert.equal(sanitized.includes("[Retirement Planning](https://jawed.co.in/notes/retirement-planning-start-with-the-number/)"),true);
assert.equal(sanitized.includes("https://example.com"),false);
assert.equal(sanitized.includes("[External]"),false);
assert.equal(sanitized.includes("External"),true);

const noSources=sanitizeMarkdownLinks("[External](https://example.com)",[]);
assert.equal(noSources,"External");

console.log("AI response grounding/link validation OK");
console.log("Allowed Jawed links preserved: yes");
console.log("Unsupported external markdown links removed: yes");
