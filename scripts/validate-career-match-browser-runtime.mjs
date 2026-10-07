import {spawn} from "node:child_process";

const BASE_URL=(process.env.BASE_URL||"https://jawed.co.in").replace(/\/$/,"");
const CHROMEDRIVER=process.env.CHROMEDRIVER||"chromedriver";
const failures=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let driver=null,sessionId=null;

async function http(method,path,body){
  const response=await fetch("http://127.0.0.1:9515"+path,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();
  let json={}; try{json=text?JSON.parse(text):{}}catch{throw new Error("ChromeDriver returned non-JSON")};
  if(!response.ok||json.value?.error)throw new Error(method+" "+path+": "+JSON.stringify(json).slice(0,600));
  return json.value;
}
async function startDriver(){
  driver=spawn(CHROMEDRIVER,["--port=9515"],{stdio:["ignore","pipe","pipe"]});
  for(let i=0;i<60;i++){try{await fetch("http://127.0.0.1:9515/status");return}catch{}await sleep(100)}
  throw new Error("ChromeDriver did not start");
}
async function command(method,path,body){return http(method,"/session/"+sessionId+path,body)}
async function js(script,args=[]){return (await command("POST","/execute/sync",{script,args}))?.value}
async function waitFor(expression,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(await js("return ("+expression+")();"))return;await sleep(100)}throw new Error("Timed out waiting for "+expression)}
async function find(selector){return command("POST","/element",{using:"css selector",value:selector})}
const elementId=e=>e["element-6066-11e4-a52e-4f735466cecf"]||e.ELEMENT;
async function click(selector){const e=await find(selector);await command("POST","/element/"+elementId(e)+"/click");await sleep(150)}
async function type(selector,value){const e=await find(selector);const id=elementId(e);await command("POST","/element/"+id+"/clear");await command("POST","/element/"+id+"/value",{text:value,value:[...value]})}
async function hitTest(selector){
  return js('const e=document.querySelector(arguments[0]);if(!e)return {missing:true};const r=e.getBoundingClientRect();const x=Math.max(0,Math.min(innerWidth-1,r.left+r.width/2));const y=Math.max(0,Math.min(innerHeight-1,r.top+r.height/2));const h=document.elementFromPoint(x,y);return {missing:false,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,pointerEvents:getComputedStyle(e).pointerEvents,width:r.width,height:r.height,hitTag:h?.tagName||null,hitId:h?.id||null,hitClass:typeof h?.className==="string"?h.className:"",hitInside:!!h&&(h===e||e.contains(h))}',[selector]);
}
async function checkControl(selector,label){
  const h=await hitTest(selector);
  if(h.missing)throw new Error(label+": missing");
  if(h.display==="none"||h.visibility==="hidden"||h.width<1||h.height<1)throw new Error(label+": not visibly interactable");
  if(h.pointerEvents==="none")throw new Error(label+": pointer-events:none");
  if(!h.hitInside)throw new Error(label+": center hit is "+h.hitTag+"#"+(h.hitId||"")+"."+(h.hitClass||""));
}
async function runViewport(width,height){
  const caps={capabilities:{alwaysMatch:{browserName:"chrome",pageLoadStrategy:"none","goog:loggingPrefs":{browser:"ALL"},"goog:chromeOptions":{args:["--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size="+width+","+height]}}}};
  const created=await http("POST","/session",caps); sessionId=created.sessionId;
  try{
    await command("POST","/url",{url:BASE_URL+"/tools/career-match-resume-review/"});
    try{await waitFor('()=>!!document.querySelector("#file")')}catch(error){let current="unknown",source="",logs=[];try{current=await command("GET","/url")}catch{}try{source=await command("GET","/source")}catch{}try{logs=await command("POST","/log",{type:"browser"})}catch{}throw new Error("page did not expose #file; url="+JSON.stringify(current)+" sourceLength="+String(source?.length||0)+" hasFileMarkup="+String(String(source).includes('id="file"'))+" logs="+JSON.stringify(logs?.slice?.(-12)||[]));} await sleep(700);
    console.log("Viewport "+width+"x"+height+": loaded");
    for(const s of ["#theme","#sample","#go","#file","#tab-analyze","#tab-results","#tab-tracker","#tab-saved"]){
      try{await checkControl(s,s)}catch(e){failures.push(width+"x"+height+" "+e.message)}
    }
    const before=await js("return document.documentElement.dataset.theme||''"); await click("#theme");
    const after=await js("return document.documentElement.dataset.theme||''");
    if(before===after)failures.push(width+"x"+height+" #theme: click did not toggle theme");
    await click("#sample");
    const sample=await js("return {r:document.querySelector('#resume').value,j:document.querySelector('#jd').value}");
    if(sample.r.trim().split(/\s+/).length<20||sample.j.trim().split(/\s+/).length<20)failures.push(width+"x"+height+" #sample: did not populate both fields");
    await click("#go"); await waitFor('()=>document.querySelectorAll("#results .card").length>0');
    const result=await js("return {count:document.querySelectorAll('#results .card').length,hidden:document.querySelector('#v-results').hidden}");
    if(!result.count||result.hidden)failures.push(width+"x"+height+" #go: results did not become visible");
    await click("#tab-tracker"); await waitFor('()=>!document.querySelector("#v-tracker").hidden');
    await type("#tCo","Browser Smoke Co"); await type("#tRole","Runtime QA"); await click("#addJob");
    if(await js("return document.querySelectorAll('#board .job').length")<1)failures.push(width+"x"+height+" tracker: Add did not create a job");
    await click("#tab-results"); await waitFor('()=>!document.querySelector("#v-results").hidden');
    await click("#results button[data-a='save']"); await sleep(150);
    await click("#tab-saved"); await waitFor('()=>!document.querySelector("#v-saved").hidden');
    if(await js("return document.querySelectorAll('#savedList .job').length")<1)failures.push(width+"x"+height+" saved: Save Analysis did not create a saved item");
    await click("#tab-analyze"); await waitFor('()=>!document.querySelector("#v-analyze").hidden');
  } finally {
    if(sessionId){try{await command("DELETE","")}catch{}sessionId=null}
  }
}
try{await startDriver();await runViewport(1440,1100);await runViewport(390,844)}
catch(error){failures.push("harness: "+error.message)}
finally{if(driver)driver.kill("SIGTERM")}
if(failures.length){console.error("Career Match production browser smoke FAILED");for(const f of failures)console.error("- "+f);process.exit(1)}
console.log("Career Match production browser smoke PASSED");
