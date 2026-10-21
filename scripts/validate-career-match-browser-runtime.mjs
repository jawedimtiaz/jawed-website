#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
const BASE_URL=(process.env.BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const CHROMEDRIVER=process.env.CHROMEDRIVER||"chromedriver";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let driver=null,sessionId=null;
async function http(method,path,body){const r=await fetch("http://127.0.0.1:9515"+path,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch{throw Error("ChromeDriver returned non-JSON")};if(!r.ok||j.value?.error)throw Error(method+" "+path+": "+JSON.stringify(j).slice(0,400));return j.value;}
async function command(method,path,body){return http(method,"/session/"+sessionId+path,body)}
async function js(script,args=[]){return command("POST","/execute/sync",{script,args})}
async function find(selector){return command("POST","/element",{using:"css selector",value:selector})}
const eid=e=>e["element-6066-11e4-a52e-4f735466cecf"]||e.ELEMENT;
async function click(selector){await js("document.querySelector(arguments[0])?.scrollIntoView({block:'center',inline:'center',behavior:'instant'})",[selector]);await sleep(150);const e=await find(selector);await command("POST","/element/"+eid(e)+"/click",{});}
async function type(selector,value){const e=await find(selector),id=eid(e);await command("POST","/element/"+id+"/clear",{});await command("POST","/element/"+id+"/value",{text:value,value:[...value]});}
async function waitFor(expression,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(await js("return ("+expression+")()"))return;await sleep(100)}throw Error("Timed out waiting for "+expression);}
try{
 driver=spawn(CHROMEDRIVER,["--port=9515"],{stdio:"ignore"});
 let ready=false;for(let i=0;i<60;i++){try{await fetch("http://127.0.0.1:9515/status");ready=true;break}catch{}await sleep(100)}assert.equal(ready,true,"ChromeDriver did not start");
 const caps={capabilities:{alwaysMatch:{browserName:"chrome",pageLoadStrategy:"normal","goog:chromeOptions":{args:["--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size=1280,900"]}}}};
 const session=await http("POST","/session",caps);sessionId=session.sessionId;
 await command("POST","/url",{url:BASE_URL+"/tools/career-match-resume-review/"});
 await waitFor("()=>document.querySelector('#resume-input')&&document.querySelector('#jd-input')");
 const startup=await js("return {h1:document.querySelector('h1')?.textContent,root:!!document.querySelector('.site-wrapper'),horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,canonical:document.querySelector('link[rel=canonical]')?.href||'',title:document.title}");
 assert.equal(startup.root,true,"React app wrapper did not render");
 assert.match(startup.h1,/resume match this job/i,"Career Match heading did not render");
 assert.equal(startup.horizontalOverflow,false,"Career Match page has horizontal overflow at desktop viewport");
 await waitFor("()=>document.querySelector('link[rel=canonical]')?.href.endsWith('/tools/career-match-resume-review')");
 assert.equal(new URL(startup.canonical).pathname,"/tools/career-match-resume-review","Career Match canonical metadata is incorrect");
 assert.ok(startup.title.includes("Career Match"),"Career Match page title was not updated");
 const resume="IT support engineer with experience in troubleshooting Windows and macOS, Jamf, MDM, Okta, Google Workspace, networking, incident management, ticket documentation, customer support, and endpoint provisioning. Improved device onboarding workflows and documented repeatable troubleshooting procedures.";
 const jd="IT Support Engineer. Required experience with troubleshooting Windows and macOS, Jamf, MDM, Okta, Google Workspace, networking, incident management, ticket documentation, customer support, endpoint provisioning, and device onboarding.";
 await type("#resume-input",resume);await type("#jd-input",jd);await click("button.button");
 await waitFor("()=>document.body.innerText.includes('Overall Match Score')",12000);
 const analysis=await js("return {score:document.body.innerText.match(/(\\d+)%\\s*Overall Match Score/)?.[1]||null,summary:document.body.innerText.includes('Tailored Professional Summary'),cover:document.body.innerText.includes('Draft Cover Letter')}");
 assert.notEqual(analysis.score,null,"Analysis score was not rendered");assert.equal(analysis.summary,true,"Professional summary not rendered");assert.equal(analysis.cover,true,"Cover letter output not rendered");
 await command("POST","/url",{url:BASE_URL+"/privacy/"});
 await waitFor("()=>document.querySelector('h1')?.textContent.includes('Privacy Policy')");
 console.log("Career Match browser runtime validation: PASS");
 console.log("Checked: SPA direct route, form inputs, analysis output, desktop overflow, and privacy route.");
}catch(e){console.error("Career Match browser runtime validation: FAIL");console.error(String(e));process.exitCode=1}
finally{if(sessionId){try{await http("DELETE","/session/"+sessionId)}catch{}}if(driver)driver.kill()}
