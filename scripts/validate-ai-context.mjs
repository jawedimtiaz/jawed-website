#!/usr/bin/env node
import assert from "node:assert/strict";
import {buildRetrievalQuery,resolveContextualReference,lastSourcePath,lastSourcePaths} from "../functions/lib/ai-retrieval.js";

const identityToWork=[
  {role:"user",content:"Who is Jawed?"},
  {role:"assistant",content:"Jawed Imtiaz is an IT professional. Source: [About Jawed Imtiaz](https://jawed.co.in/about/)"},
  {role:"user",content:"Where does he work?"}
];
const workQuery=buildRetrievalQuery(identityToWork);
assert.match(workQuery,/Where does Jawed work\?/i);
assert.match(workQuery,/Who is Jawed\?/i);

const educationFollowUp=[
  {role:"user",content:"Who is Jawed?"},
  {role:"assistant",content:"Jawed Imtiaz is an IT professional. Source: [About Jawed Imtiaz](https://jawed.co.in/about/)"},
  {role:"user",content:"What is his education?"}
];
const educationQuery=buildRetrievalQuery(educationFollowUp);
assert.match(educationQuery,/What is Jawed's education\?/i);

const sourceFollowUp=[
  {role:"user",content:"Who is Jawed?"},
  {role:"assistant",content:"Jawed Imtiaz is an IT professional. Source: [About Jawed Imtiaz](https://jawed.co.in/about/)"},
  {role:"user",content:"Tell me more about that"}
];
const sourceQuery=buildRetrievalQuery(sourceFollowUp);
assert.match(sourceQuery,/Previous source context: \/about\//);
assert.equal(lastSourcePath(sourceFollowUp),"/about/");
assert.deepEqual(lastSourcePaths(sourceFollowUp),["/about/"]);

const staleSource=buildRetrievalQuery([
  {role:"user",content:"Who is Jawed?"},
  {role:"assistant",content:"Jawed Imtiaz is an IT professional. Source: [About Jawed Imtiaz](https://jawed.co.in/about/)"},
  {role:"user",content:"What is MDM?"},
  {role:"assistant",content:"MDM is device management."},
  {role:"user",content:"Tell me more about that"}
]);
assert.doesNotMatch(staleSource,/Previous source context: \/about\//);

const userInjectedSource=buildRetrievalQuery([
  {role:"user",content:"Find https://jawed.co.in/about/"},
  {role:"assistant",content:"I could not find a matching source."},
  {role:"user",content:"Tell me more about that"}
]);
assert.doesNotMatch(userInjectedSource,/Previous source context:/);

const noContext=buildRetrievalQuery([
  {role:"user",content:"Tell me more about that"},
  {role:"assistant",content:"I don't have enough context."},
  {role:"user",content:"What about that?"}
]);
assert.doesNotMatch(noContext,/Previous source context:/);

const unrelated=resolveContextualReference("What is MDM?",[
  {role:"user",content:"Who is Jawed?"},
  {role:"assistant",content:"About Jawed."}
]);
assert.equal(unrelated,"What is MDM?");

console.log("AI conversational context validation: PASS");
console.log("Pronoun reference resolution: PASS");
console.log("Prior source reference resolution: PASS");
console.log("Latest-assistant source boundary: PASS");
console.log("User-supplied source URL ignored: PASS");
console.log("No-context safety boundary: PASS");
