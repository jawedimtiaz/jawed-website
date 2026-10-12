import {spawn} from "node:child_process";

const BASE_URL=(process.env.BASE_URL||"https://jawed.co.in").replace(/\/$/,"");
const CHROMEDRIVER=process.env.CHROMEDRIVER||"chromedriver";
const failures=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let driver=null,sessionId=null;

async function http(method,path,body){
  const response=await fetch("http://127.0.0.1:9515"+path,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();
  let json={};try{json=text?JSON.parse(text):{}}catch{throw new Error("ChromeDriver returned non-JSON")};
  if(!response.ok||json.value?.error)throw new Error(method+" "+path+": "+JSON.stringify(json).slice(0,600));
  return json.value;
}
async function startDriver(){
  driver=spawn(CHROMEDRIVER,["--port=9515"],{stdio:["ignore","pipe","pipe"]});
  for(let i=0;i<60;i++){try{await fetch("http://127.0.0.1:9515/status");return}catch{}await sleep(100)}
  throw new Error("ChromeDriver did not start");
}
async function command(method,path,body){return http(method,"/session/"+sessionId+path,body)}
async function js(script,args=[]){return command("POST","/execute/sync",{script,args})}
async function waitForElement(selector,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){try{await find(selector);return}catch{}await sleep(100)}throw new Error("Timed out waiting for element "+selector)}
async function waitFor(expression,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(await js("return ("+expression+")();"))return;await sleep(100)}throw new Error("Timed out waiting for "+expression)}
async function find(selector){return command("POST","/element",{using:"css selector",value:selector})}
const elementId=e=>e["element-6066-11e4-a52e-4f735466cecf"]||e.ELEMENT;
async function click(selector){const e=await find(selector);await command("POST","/element/"+elementId(e)+"/click",{});await sleep(180)}
async function type(selector,value){const e=await find(selector);const id=elementId(e);await command("POST","/element/"+id+"/clear",{});if(value!=="")await command("POST","/element/"+id+"/value",{text:value,value:[...value]});await sleep(180)}
async function textOf(selector){return js("return document.querySelector(arguments[0])?.textContent.trim()||''",[selector])}
async function valueOf(selector){return js("return document.querySelector(arguments[0])?.value||''",[selector])}
async function hitTest(selector){
  return js('return (()=>{const e=document.querySelector(arguments[0]);if(!e)return {missing:true};document.documentElement.style.setProperty("scroll-behavior","auto","important");e.scrollIntoView({block:"center",inline:"center",behavior:"instant"});const r=e.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {missing:false,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,pointerEvents:getComputedStyle(e).pointerEvents,width:r.width,height:r.height,hitInside:!!h&&(h===e||e.contains(h)),hitTag:h?.tagName||null,hitId:h?.id||null}})()',[selector]);
}
async function checkControl(selector,label){
  const h=await hitTest(selector);
  if(h.missing)throw new Error(label+": missing");
  if(h.display==="none"||h.visibility==="hidden"||h.width<1||h.height<1)throw new Error(label+": not visibly interactable");
  if(h.pointerEvents==="none")throw new Error(label+": pointer-events:none");
  if(!h.hitInside)throw new Error(label+": center hit is "+h.hitTag+"#"+(h.hitId||""));
}
async function openPage(path,selector){
  await command("POST","/url",{url:BASE_URL+path});
  await waitForElement(selector);
  await sleep(250);
}
async function submit(formSelector){await click(formSelector+" button[type=submit]");await sleep(250)}
async function waitForProductionRevision(){
  const checks=[
    ["/tools/compound-growth-sip-calculator/",'reset.addEventListener("click",()=>{f.reset();err.textContent="";calculate()})'],
    ["/tools/inflation-goal-planning-calculator/",'field.value.trim()===""||!field.checkValidity()'],
    ["/tools/retirement-planning-calculator/",'el[id].value.trim()===""||!el[id].checkValidity()'],
    ["/tools/personal-finance-snapshot/",'$(id).value.trim()===""||!Number.isFinite(n(id))||n(id)<0']
  ];
  for(let attempt=0;attempt<120;attempt++){
    let ready=true;
    for(const [path,marker] of checks){
      try{const response=await fetch(BASE_URL+path,{cache:"no-store"});const source=await response.text();if(!response.ok||!source.includes(marker)){ready=false;break;}}
      catch{ready=false;break;}
    }
    if(ready){console.log("Production revision markers are live.");return;}
    await sleep(1000);
  }
  throw new Error("Production did not expose the expected finance-tool revision within 120 seconds.");
}
async function testGrowth(label){
  await openPage("/tools/compound-growth-sip-calculator/","#initial");
  await checkControl("#growth-tool button[type='submit']",label+" growth submit");
  await checkControl("#growth-reset",label+" growth reset");
  const baseline=await textOf("#future-value");
  if(!baseline||baseline==="—")throw new Error(label+" growth default result is missing");
  await type("#initial","150000");await submit("#growth-tool");
  const changed=await textOf("#future-value");
  if(!changed||changed==="—"||changed===baseline)throw new Error(label+" growth did not recalculate after changing initial amount");
  await click("#growth-reset");
  if(await valueOf("#initial")!=="100000")throw new Error(label+" growth reset did not restore its default input");
  if(await textOf("#future-value")!==baseline)throw new Error(label+" growth reset did not restore the default result");
  await type("#initial","");await submit("#growth-tool");
  const blankGrowthValue=await valueOf("#initial"),growthError=await textOf("#growth-error");if(blankGrowthValue!==""||!growthError.includes("Enter a value"))throw new Error(label+" growth blank input validation mismatch: value="+JSON.stringify(blankGrowthValue)+" error="+JSON.stringify(growthError));
  if(await textOf("#future-value")!=="—")throw new Error(label+" growth blank input left a stale result visible");
  await click("#growth-reset");
}
async function testGoal(label){
  await openPage("/tools/inflation-goal-planning-calculator/","#cost");
  await checkControl("#goal-tool button[type='submit']",label+" goal submit");
  await checkControl("#goal-reset",label+" goal reset");
  const baseline=await textOf("#future");
  if(!baseline||baseline==="—")throw new Error(label+" goal default result is missing");
  await type("#cost","");await submit("#goal-tool");
  if(!(await textOf("#goal-error")).includes("Enter a value"))throw new Error(label+" goal blank input did not show validation feedback");
  if(await textOf("#future")!=="—")throw new Error(label+" goal blank input left a stale result visible");
  await click("#goal-reset");
  if(await valueOf("#cost")!=="1000000"||await textOf("#future")!==baseline)throw new Error(label+" goal reset did not restore defaults and results");
}
async function testRetirement(label){
  await openPage("/tools/retirement-planning-calculator/","#age");
  await checkControl("#retirement-tool button[type='submit']",label+" retirement submit");
  await checkControl("#retirement-reset",label+" retirement reset");
  const baseline=await textOf("#required-corpus");
  if(!baseline||baseline==="—")throw new Error(label+" retirement default result is missing");
  await type("#age","");await submit("#retirement-tool");
  if(!(await textOf("#retirement-error")).includes("Enter a value"))throw new Error(label+" retirement blank input did not show validation feedback");
  if(await textOf("#required-corpus")!=="—")throw new Error(label+" retirement blank input left a stale result visible");
  await click("#retirement-reset");
  if(await valueOf("#age")!=="45"||await textOf("#required-corpus")!==baseline)throw new Error(label+" retirement reset did not restore defaults and results");
}
async function testSnapshot(label){
  await openPage("/tools/personal-finance-snapshot/","#income");
  await checkControl("#finance-tool button[type='submit']",label+" snapshot submit");
  await checkControl("#reset",label+" snapshot reset");
  const spending=await textOf("#spending"),netWorth=await textOf("#netWorth");
  if(spending.replace(/\s/g,"")!=="₹60,000"||netWorth.replace(/\s/g,"")!=="₹16,00,000")throw new Error(label+" snapshot default math mismatch: spending="+spending+", netWorth="+netWorth);
  await type("#income","");await sleep(200);
  if(!(await textOf("#error")).includes("Enter zero or a positive number"))throw new Error(label+" snapshot blank input did not show validation feedback");
  if(await textOf("#spending")!=="—"||await textOf("#netWorth")!=="—")throw new Error(label+" snapshot blank input left stale outputs visible");
  await click("#reset");
  if(await valueOf("#income")!=="100000"||await textOf("#spending")!==spending||await textOf("#netWorth")!==netWorth)throw new Error(label+" snapshot reset did not restore default inputs and outputs");
}
async function runViewport(width,height){
  const caps={capabilities:{alwaysMatch:{browserName:"chrome",pageLoadStrategy:"none","goog:loggingPrefs":{browser:"ALL"},"goog:chromeOptions":{args:["--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size="+width+","+height]}}}};
  const created=await http("POST","/session",caps);sessionId=created.sessionId;
  try{
    const label=width+"x"+height;
    await testGrowth(label);
    await testGoal(label);
    await testRetirement(label);
    await testSnapshot(label);
    console.log("Finance tools viewport "+label+": PASS");
  }finally{if(sessionId){try{await command("DELETE","")}catch{}sessionId=null}}
}
try{
  await waitForProductionRevision();
  await startDriver();
  await runViewport(1440,1100);
  await runViewport(390,844);
}catch(error){failures.push("harness: "+error.message)}
finally{if(driver)driver.kill("SIGTERM")}
if(failures.length){console.error("Finance tools browser runtime smoke FAILED");for(const failure of failures)console.error("- "+failure);process.exit(1)}
console.log("Finance tools browser runtime smoke PASSED");
