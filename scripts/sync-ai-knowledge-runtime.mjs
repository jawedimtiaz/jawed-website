#!/usr/bin/env node
import fs from "node:fs";

const sourcePath="assets/data/ai-knowledge.json";
const runtimePath="functions/lib/ai-knowledge-data.js";
const knowledge=JSON.parse(fs.readFileSync(sourcePath,"utf8"));
const runtime=`const knowledge=${JSON.stringify(knowledge)};
export default knowledge;
`;
fs.writeFileSync(runtimePath,runtime);
console.log("AI knowledge runtime synchronized");
