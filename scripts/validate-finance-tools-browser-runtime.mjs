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
async function click(selector){await js("document.querySelector(arguments[0])?.scrollIntoView({block:'center',inline:'center'})",[selector]);await sleep(80);await js("document.querySelector(arguments[0])?.click()",[selector]);await sleep(150);}
async function type(selector,value){const e=await find(selector),id=eid(e);await command("POST","/element/"+id+"/clear",{});await command("POST","/element/"+id+"/value",{text:value,value:[...value]});await sleep(180)}
async function waitFor(expression,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(await js("return ("+expression+")()"))return;await sleep(100)}throw Error("Timed out waiting for "+expression)}
async function openPage(path,selector="h1"){await command("POST","/url",{url:BASE_URL+path});await waitFor("()=>!!document.querySelector("+JSON.stringify(selector)+")");await sleep(120)}
function expectedCanonicalPath(path){
 const p=(path.split("?")[0]||"/").replace(/\/+$/,"")||"/";
 if(p==="/")return "/";
 if(p==="/guides"||p==="/field-guides")return "/field-guides/";
 if(p==="/notes")return "/field-guides/";
 if(p==="/tools"||p==="/diagnostic-tools")return "/tools/";
 if(p==="/services"||p==="/services-dispatch")return "/services-dispatch/";
 if(p.startsWith("/notes/"))return p;
 if(p.startsWith("/guides/")||p.startsWith("/field-guides/"))return "/field-guides/"+p.split("/").filter(Boolean).at(-1);
 if(p==="/tools/calculator")return "/tools/retirement-planning-calculator";
 if(p.startsWith("/tools/"))return p;
 if(["/work/projects","/work/experience","/work/skills","/work/certifications"].includes(p))return p+"/";
 if(p==="/blog")return "/blog/";
 if(p.startsWith("/blog/"))return p;
 if(["/about","/work","/topics","/resources","/contact","/privacy","/terms","/cookies","/ai"].includes(p))return p+"/";
 return "/404";
}

async function pageState(){return js("return {title:document.title,h1:document.querySelector('h1')?.innerText||'',root:!!document.querySelector('.site-wrapper'),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,body:document.body.innerText||'',adSlots:document.querySelectorAll('.adsense-container').length}")}
async function testReset(path,inputSelector){await openPage(path,inputSelector);const before=await js("return document.querySelector(arguments[0]).value",[inputSelector]);await type(inputSelector,"123456");const changed=await js("return document.querySelector(arguments[0]).value",[inputSelector]);assert.equal(changed,"123456",path+" input did not accept changes");await js("Array.from(document.querySelectorAll('button')).find(b=>/reset/i.test(b.innerText))?.click()");await sleep(150);const after=await js("return document.querySelector(arguments[0]).value",[inputSelector]);assert.equal(after,before,path+" reset did not restore the original input");console.log("PASS — reset interaction "+path)}
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
  ["/tools/ipv4-subnet-calculator/","IPv4 Subnet"],
  ["/tools/server-rack-power-btu-calculator/","Server Rack Power"],
  ["/tools/career-match-resume-review/","How well does your resume match this job?"],
  ["/tools/","Tools & Calculators"],
  ["/diagnostic-tools/","Tools & Calculators"],
  ["/field-guides/","Field Guides & Knowledge Base"],
  ["/field-guides/rj45-cabling-t568a-vs-t568b-guide/","Comprehensive Guide to RJ45 Cabling"],
  ["/guides/rj45-cabling-t568a-vs-t568b-guide/","Comprehensive Guide to RJ45 Cabling"],
  ["/guides/","Field Guides & Knowledge Base"],
  ["/services/","Services & IT Field Dispatch"],
  ["/services-dispatch/","Services & IT Field Dispatch"],
  ["/about/","About Jawed Imtiaz"],
  ["/work/","Work & Experience"],
  ["/work/projects/","Projects & Work Evidence"],
  ["/work/experience/","Experience"],
  ["/work/skills/","Skills"],
  ["/work/certifications/","Certifications"],
  ["/contact/","Contact Us"],
  ["/privacy/","Privacy Policy"],
  ["/terms/","Terms of Service"],
  ["/cookies/","Cookie Policy & Preferences"],
  ["/ai/","Jawed AI Assistant"],
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
  const expectedCanonical="https://jawed.co.in"+expectedCanonicalPath(path);
  await waitFor("()=>document.querySelector('link[rel=canonical]')?.href === "+JSON.stringify(expectedCanonical));
  const canonical=await js("return document.querySelector('link[rel=canonical]')?.href||''");
  assert.equal(canonical,expectedCanonical,path+" canonical metadata mismatch");
  assert.ok(state.title.length>5,path+" has an empty document title");
  assert.equal(state.adSlots,0,path+" must not display ad placeholders before activation");
  const currentRobots=await js("return document.querySelector('meta[name=robots]')?.content||''");
  if(path.startsWith("/ai/"))assert.ok(currentRobots.includes("noindex"),"AI assistant page should not be indexed as a thin interactive surface");
  else assert.ok(currentRobots.includes("index"),path+" should have indexable robots metadata");
  console.log("PASS — direct route and canonical metadata "+path);
 }

 await testReset("/tools/compound-growth-sip-calculator/","#initial");
 await testReset("/tools/inflation-goal-planning-calculator/","#cost");
 await testReset("/tools/retirement-planning-calculator/","#age");
 await testReset("/tools/personal-finance-snapshot/","#income");

 await openPage("/tools/ai-prompt-builder/","#goal");
 await type("#goal","Diagnose a workplace VPN connection issue");
 const prompt=await js("return document.querySelector('pre.tool-output')?.innerText||''");
 assert.ok(prompt.includes("Diagnose a workplace VPN connection issue"),"AI Prompt Builder output did not reflect input");
 await js("Array.from(document.querySelectorAll('button')).find(b=>/reset/i.test(b.innerText))?.click()");
 await sleep(150);
 assert.equal(await js("return document.querySelector('#goal').value"),"","AI Prompt Builder reset did not clear input");
 console.log("PASS — AI Prompt Builder output and reset");

 await openPage("/tools/resume-bullet-strength-checker/","textarea");
 await type("textarea","Resolved 35 endpoint provisioning incidents per week and reduced average onboarding time by 22%.");
 await waitFor("()=>document.body.innerText.includes('Line-by-Line Breakdown')");
 assert.equal(await js("return document.querySelector('textarea').value"),"Resolved 35 endpoint provisioning incidents per week and reduced average onboarding time by 22%.","Resume bullet input not retained");
 console.log("PASS — Resume Bullet Strength Checker accepts text");

 await openPage("/tools/service-desk-note-formatter/","#issueSummary");
 await type("#issueSummary","VPN sign-in failed after device enrollment");
 assert.ok(await js("return document.querySelector('pre.tool-output')?.innerText.includes('VPN sign-in failed after device enrollment')"),"Service Desk Note Formatter output did not include entered issue");
 console.log("PASS — Service Desk Note Formatter accepts issue details");

 await openPage("/tools/ticket-to-knowledge-base-draft/","#kbTitle");
 await type("#kbTitle","VPN sign-in recovery checklist");
 await type("#symptoms","VPN sign-in fails after device enrollment.");
 assert.ok(await js("return document.querySelector('pre.tool-output')?.innerText.includes('VPN sign-in recovery checklist')"),"Knowledge-base draft output did not include title");
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
