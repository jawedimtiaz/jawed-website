#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const script=fs.readFileSync("assets/js/main.js","utf8");
const style=fs.readFileSync("assets/css/style.css","utf8");
assert.match(script,/panel\.setAttribute\("aria-busy","true"\)/);
assert.match(script,/panel\.setAttribute\("aria-busy","false"\)/);
assert.match(script,/form\.setAttribute\("aria-busy","true"\)/);
assert.match(script,/form\.setAttribute\("aria-busy","false"\)/);
assert.match(script,/list\.setAttribute\("aria-label","Sources"\)/);
assert.match(style,/\.jawed-ai-widget-status\{[^}]*min-height:1\.3em/);
assert.match(script,/status\.textContent="Thinking…"/);
console.log("AI UX conversation polish validation: PASS");
console.log("Conversation busy-state semantics: PASS");
console.log("Source labeling: PASS");
console.log("Loading status: PASS");
