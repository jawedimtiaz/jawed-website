#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawn} from "node:child_process";

const BASE_URL=(process.env.BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const CHROMEDRIVER=process.env.CHROMEDRIVER||"chromedriver";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let driver=null,sessionId=null;
async function http(method,path,body){const r=await fetch("http://127.0.0.1:9515"+path,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch{throw Error("ChromeDriver returned non-JSON")};if(!r.ok||j.value?.error)throw Error(method+" "+path+": "+JSON.stringify(j).slice(0,500));return j.value;}
async function command(method,path,body){return http(method,"/session/"+sessionId+path,body)}
async function js(script,args=[]){return command("POST","/execute/sync",{script,args})}
async function find(selector){return command("POST","/element",{using:"css selector",value:selector})}
const eid=e=>e["element-6066-11e4-a52e-4f735466cecf"]||e.ELEMENT;
async function click(selector){await js("document.querySelector(arguments[0])?.scrollIntoView({block:'center',inline:'center'})",[selector]);await sleep(80);const e=await find(selector);await command("POST","/element/"+eid(e)+"/click",{});await sleep(150)}
async function type(selector,value){const e=await find(selector),id=eid(e);await command("POST","/element/"+id+"/clear",{});await command("POST","/element/"+id+"/value",{text:value,value:[...value]});await sleep(180)}
async function waitFor(expression,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(await js("return ("+expression+")()"))return;await sleep(100)}throw Error("Timed out waiting for "+expression)}
async function openPage(path,selector="h1"){await command("POST","/url",{url:BASE_URL+path});await waitFor("()=>!!document.querySelector("+JSON.stringify(selector)+")");await sleep(120)}
async function pageState(){return js("return {title:document.title,h1:document.querySelector('h1')?.innerText||'',root:!!document.querySelector('.site-wrapper'),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,body:document.body.innerText||''}")}
async function testReset(path,inputSelector){await openPage(path,inputSelector);const before=await js("return document.querySelector(arguments[0]).value",[inputSelector]);await type(inputSelector,"123456");const changed=await js("return document.querySelector(arguments[0]).value",[inputSelector]);assert.equal(changed,"123456",path+" input did not accept changes");await click("button.button-secondary");const after=await js("return document.querySelector(arguments[0]).value",[inputSelector]);assert.equal(after,before,path+" reset did not restore the original input");console.log("PASS — reset interaction "+path)}
try{
 driver=spawn(CHROMEDRIVER,["--port=9515"],{stdio:"ignore"});
 let ready=false;for(let i=0;i<60;i++){try{await fetch("http://127.0.0.1:9515/status");ready=true;break}catch{}await sleep(100)}assert.equal(ready,true,"ChromeDriver did not start");
 const caps={capabilities:{alwaysMatch:{browserName:"chrome",pageLoadStrategy:"normal","goog:chromeOptions":{args:["--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size=1280,900"]}}}};
 const session=await http("POST","/session",caps);sessionId=session.sessionId;

 const routes=[
  ["/tools/compound-growth-sip-calculator/","Compound Growth & SIP Calculator"],
  ["/tools/inflation-goal-planning-calculator/","Inflation & Goal Planning Calculator"],
  ["/tools/retirement-planning-calculator/","Retirement Planning Calculator"],
  ["/tools/personal-finance-snapshot/","Personal Finance Snapshot"],
  ["/tools/finance-planning-workspace/","Finance Planning Workspace"],
  ["/tools/ai-prompt-builder/","AI Prompt Builder"],
  ["/tools/interview-preparation-planner/","Interview Preparation Planner"],
  ["/tools/it-troubleshooting-assistant/","IT Troubleshooting Assistant"],
  ["/tools/resume-bullet-strength-checker/","Resume Bullet Strength Checker"],
  ["/tools/service-desk-note-formatter/","Service Desk Note Formatter"],
  ["/tools/ticket-to-knowledge-base-draft/","Ticket to Knowledge Base"],
  ["/tools/","Tools & Calculators"],
  ["/topics/","Topics"],
  ["/resources/","IT Support & Web Resources"],
  ["/notes/","Field Guides & Knowledge Base"],
  ["/blog/","Blog"],
  ["/notes/retirement-withdrawals-sequence-risk-income-review/","Retirement Withdrawals"],
  ["/notes/portfolio-allocation-rebalancing-framework/","Portfolio Allocation"],
  ["/notes/us-stocks-etfs-starting-point/","US Stocks"],
  ["/notes/it-troubleshooting-guide-knowledge-base/","IT Troubleshooting Guides"]
 ];
 for(const [path,heading] of routes){
  await openPage(path);
  const state=await pageState();
  assert.equal(state.root,true,path+" did not mount the React application");
  assert.equal(state.overflow,false,path+" has horizontal overflow at desktop viewport");
  assert.ok(state.h1.toLowerCase().includes(heading.toLowerCase()),path+" rendered unexpected heading: "+state.h1);
  console.log("PASS — direct route "+path);
 }

 await testReset("/tools/compound-growth-sip-calculator/","#initial");
 await testReset("/tools/inflation-goal-planning-calculator/","#cost");
 await testReset("/tools/retirement-planning-calculator/","#age");
 await testReset("/tools/personal-finance-snapshot/","#income");

 await openPage("/tools/ai-prompt-builder/","#goal");
 await type("#goal","Diagnose a workplace VPN connection issue");
 const prompt=await js("return document.querySelector('pre.tool-output')?.innerText||''");
 assert.ok(prompt.includes("Diagnose a workplace VPN connection issue"),"AI Prompt Builder output did not reflect input");
 await click("button.button-secondary");
 assert.equal(await js("return document.querySelector('#goal').value"),"","AI Prompt Builder reset did not clear input");
 console.log("PASS — AI Prompt Builder output and reset");

 await openPage("/tools/resume-bullet-strength-checker/","textarea");
 await type("textarea","Resolved 35 endpoint provisioning incidents per week and reduced average onboarding time by 22%.");
 await waitFor("()=>document.body.innerText.includes('Line-by-Line Breakdown')");
 assert.ok((await pageState()).body.includes("Resolved 35 endpoint provisioning incidents"),"Resume bullet input not reflected in page");
 console.log("PASS — Resume Bullet Strength Checker accepts text");

 await openPage("/tools/service-desk-note-formatter/","#issueSummary");
 await type("#issueSummary","VPN sign-in failed after device enrollment");
 assert.ok((await pageState()).body.includes("VPN sign-in failed after device enrollment"),"Service Desk Note Formatter did not retain entered issue");
 console.log("PASS — Service Desk Note Formatter accepts issue details");

 await openPage("/tools/ticket-to-knowledge-base-draft/","#kbTitle");
 await type("#kbTitle","VPN sign-in recovery checklist");
 await type("#symptoms","VPN sign-in fails after device enrollment.");
 assert.ok((await pageState()).body.includes("VPN sign-in recovery checklist"),"Knowledge-base draft did not retain title");
 console.log("PASS — Ticket-to-KB Draft accepts structured input");

 await openPage("/tools/interview-preparation-planner/","#roleTitle");
 await type("#roleTitle","IT Support Engineer");
 await type("#targetCompany","Example Company");
 const interview=await js("return {role:document.querySelector('#roleTitle').value,company:document.querySelector('#targetCompany').value}");
 assert.equal(interview.role,"IT Support Engineer");assert.equal(interview.company,"Example Company");
 console.log("PASS — Interview Preparation Planner accepts role details");

 await openPage("/tools/it-troubleshooting-assistant/","#symptom");
 await type("#symptom","The user cannot connect to corporate VPN");
 assert.equal(await js("return document.querySelector('#symptom').value"),"The user cannot connect to corporate VPN");
 console.log("PASS — IT Troubleshooting Assistant accepts symptom");

 await openPage("/notes/","#note-search");
 await type("#note-search","Jamf");
 assert.equal(await js("return document.querySelector('#note-search').value"),"Jamf");
 console.log("PASS — Notes search input");

 await openPage("/tools/","input[type=search]");
 await type("input[type=search]","retirement");
 const toolsBody=(await pageState()).body.toLowerCase();
 assert.ok(toolsBody.includes("retirement"),"Tool discovery search lost its query");
 console.log("PASS — Tools discovery search input");

 await command("POST","/window/rect",{width:390,height:844});
 await openPage("/tools/","h1");
 const mobile=await js("return {width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,h1:document.querySelector('h1')?.innerText||''}");
 assert.ok(mobile.scrollWidth<=mobile.width+1,"Tools page has horizontal overflow at mobile viewport: "+JSON.stringify(mobile));
 console.log("PASS — mobile Tools page layout");
 console.log("Interactive tools and content discovery browser runtime validation: PASS");
}catch(e){console.error("Interactive tools and content discovery browser runtime validation: FAIL");console.error(String(e));process.exitCode=1}
finally{if(sessionId){try{await http("DELETE","/session/"+sessionId)}catch{}}if(driver)driver.kill()}
