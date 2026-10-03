#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {findRelevantKnowledge} from "../functions/lib/ai-knowledge.js";

const knowledge=JSON.parse(fs.readFileSync("assets/data/ai-knowledge.json","utf8"));
assert.equal(knowledge.version,3);
assert.equal(knowledge.knowledge_expansion?.phase,"33");

const cases=[
  ["What skills does Jawed have?","/work/skills/"],
  ["What certifications does Jawed have?","/work/certifications/"],
  ["What projects has Jawed worked on?","/work/projects/"],
  ["Where can I find official documentation resources?","/resources/"],
  ["How does the IT troubleshooting assistant work?","/tools/it-troubleshooting-assistant/"],
  ["Does the resume tool upload my resume to a server?","/tools/career-match-resume-review/"],
  ["What does the finance planning workspace do?","/tools/finance-planning-workspace/"],
  ["What is the service desk troubleshooting workflow?","/notes/it-service-desk-troubleshooting-workflow/"],
  ["What are Apple enrollment models?","/notes/apple-device-management-enrollment-models/"],
  ["How can AI help with IT support?","/notes/ai-for-it-support-practical-workflow/"],
  ["How should interactive AI tools be architected?","/notes/interactive-tools-ai-assisted-experiences-architecture/"]
];

for(const [query,expected] of cases){
  const results=findRelevantKnowledge(query,5,{primaryQuery:query});
  assert.equal(results.some(source=>source.url===expected),true,query+" did not retrieve "+expected);
}

const expandedPaths=[
  "/work/skills/","/work/certifications/","/work/projects/","/resources/",
  "/tools/it-troubleshooting-assistant/","/tools/career-match-resume-review/","/tools/finance-planning-workspace/",
  "/notes/it-service-desk-troubleshooting-workflow/","/notes/apple-device-management-enrollment-models/",
  "/notes/ai-for-it-support-practical-workflow/","/notes/interactive-tools-ai-assisted-experiences-architecture/"
];
for(const path of expandedPaths){
  const entry=knowledge.entries.find(item=>item.url===path);
  assert.ok(entry,"Missing expanded entry "+path);
  assert.ok(entry.summary.length>=180,"Expanded summary too short for "+path);
  assert.ok(entry.keywords.length>=8,"Expanded keyword set too small for "+path);
}

console.log("AI knowledge expansion validation: PASS");
console.log("Expanded semantic entries:",expandedPaths.length);
console.log("Source-backed retrieval cases:",cases.length);