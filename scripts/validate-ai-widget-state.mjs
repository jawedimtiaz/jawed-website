#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("assets/js/main.js","utf8");
const style=fs.readFileSync("assets/css/style.css","utf8");

const checks=[
  ["AI widget panel starts hidden",/panel\.hidden=true/],
  ["AI widget hidden attribute forces display none",/\.jawed-ai-panel\[hidden\]\{display:none!important\}/],
  ["AI widget close button is a real button",/close\.type="button"/],
  ["AI widget close button has accessible label",/close\.setAttribute\("aria-label","Close Jawed AI"\)/],
  ["AI widget minimize button invokes close state",/minimize\.addEventListener\("click",e=>\{e\.preventDefault\(\);e\.stopPropagation\(\);setOpen\(false\)\}\)/],
  ["AI widget close button invokes close state",/close\.addEventListener\("click",e=>\{e\.preventDefault\(\);e\.stopPropagation\(\);setOpen\(false\)\}\)/],
  ["AI widget close button carries close marker",/close\.dataset\.jawedAiClose="true"/],
  ["AI widget has an explicit minimize control",/minimize\.dataset\.jawedAiClose="true"/],
  ["AI widget setOpen hides panel on close",/const setOpen=open=>\{panel\.hidden=!open;/],
  ["AI widget Escape closes only when open",/if\(e\.key==="Escape"&&!panel\.hidden\)setOpen\(false\)/],
  ["AI widget close returns focus to toggle",/else toggle\.focus\(\)/],
  ["AI widget toggle reflects expanded state",/toggle\.setAttribute\("aria-expanded",String\(open\)\)/],
  ["AI widget label reflects open/close state",/toggle\.setAttribute\("aria-label",open\?"Close Jawed AI":"Open Jawed AI"\)/],
  ["AI widget request completion does not steal focus after close",/if\(!panel\.hidden\)input\.focus\(\)/]
];

for(const [name,pattern] of checks){
  const haystack=name==="AI widget hidden attribute forces display none"?style:source;
  assert.match(haystack,pattern,name+" contract is missing");
  console.log("PASS — "+name);
}

assert.equal(source.includes('panel.hidden=true'),true,"Initial panel state must be explicitly hidden");
assert.match(style,/\.jawed-ai-panel\[hidden\]\{display:none!important\}/,"CSS must enforce hidden panel state");
assert.equal(source.includes('close.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();setOpen(false)});'),true,"Close control must remain directly attached to close state");
assert.equal(source.includes('minimize.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();setOpen(false)});'),true,"Minimize control must remain directly attached to close state");
assert.match(source,/if\(e\.key==="Escape"&&!panel\.hidden\)setOpen\(false\)/,"Escape handler must close the open panel");
assert.equal(source.includes('else toggle.focus()'),true,"Close path must return focus to the toggle");

console.log("\nAI widget state regression validation: PASS");
console.log("State contracts checked:",checks.length);
