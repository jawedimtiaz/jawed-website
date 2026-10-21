#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const read=path=>fs.readFileSync(path,"utf8");
const app=read("src/App.tsx"),engine=read("src/services/aiKnowledgeEngine.ts"),widget=read("src/components/JawedAiWidget.tsx"),aiPage=read("src/pages/AiPage.tsx");
const knowledge=JSON.parse(read("src/data/aiKnowledge.json"));
const checks=[
 ["current AI route is registered",/path="\/ai(?:\/\*)?"/.test(app)&&app.includes("<AiPage")],
 ["AI knowledge service uses bundled client-side data",engine.includes("rawKnowledge from '../data/aiKnowledge.json'")&&!/fetch\(['"]\/api\/ai/.test(engine)],
 ["personal-query guardrail is implemented",engine.includes("export function isPersonalQuery")&&engine.includes("PERSONAL_CATEGORIES")],
 ["location-question guard uses explicit natural-language patterns",engine.includes("PERSONAL_LOCATION_QUESTIONS")&&engine.includes("where")&&engine.includes("located")],
 ["education terms are not blanket-blocked as privacy categories",! /"net worth"|"income"/.test(engine.match(/const PERSONAL_CATEGORIES = \[([\s\S]*?)\];/)?.[1]||"")],
 ["sensitive profile fact terms are checked in subject context",engine.includes("PERSONAL_FACT_TERMS")&&engine.includes("asksAboutJawed")&&engine.includes("asksAboutPersonalSubject")],
 ["public profile location query intent is handled explicitly",engine.includes("PERSONAL_LOCATION_QUESTIONS")&&engine.includes("where")&&engine.includes("located")],
 ["net worth education is not globally blocked as a personal category",!/"net worth"/.test(engine.match(/const PERSONAL_CATEGORIES = \[([\s\S]*?)\];/)?.[1]||"")],
 ["privacy guard checks personal facts in context and blocks private identifiers",engine.includes("PERSONAL_FACT_TERMS")&&engine.includes('"salary"')&&engine.includes('"home address"')],


 ["technical retrieval is implemented",engine.includes("export function searchKnowledge")&&engine.includes("meaningfulTerms")],
 ["knowledge dataset contains entries",Array.isArray(knowledge.entries)&&knowledge.entries.length>0],
 ["knowledge entries contain source metadata",knowledge.entries.every(x=>typeof x.title==="string"&&x.title.trim()&&typeof x.url==="string"&&x.url.startsWith("/")&&typeof x.summary==="string"&&Array.isArray(x.keywords))],
 ["AI widget starts closed",widget.includes("useState<boolean>(false)")&&widget.includes("{!isOpen && (")],
 ["AI widget hides on dedicated AI route",widget.includes("location.pathname.startsWith('/ai')")],
 ["AI widget has close and minimize handlers",widget.includes("const closeWidget = () =>")&&widget.includes("const toggleMinimize = () =>")&&widget.includes("onClick={closeWidget}")&&widget.includes("onClick={toggleMinimize}")],
 ["AI page explains knowledge-grounded answers",aiPage.includes("Responses are retrieved directly from published website knowledge")],
 ["AI page exposes source links",aiPage.includes("Referenced Sources:")&&aiPage.includes("<Link to={src.url}")],
];
for(const [name,ok] of checks){assert.equal(ok,true,name);console.log("PASS — "+name);}
console.log("\nAI Regression Gate: PASS");
console.log("Checks:",checks.length);
console.log("Architecture: React/Vite client-side knowledge retrieval; no server AI endpoint assumed.");
