import {spawn} from "node:child_process";

const BASE_BRANCH=(process.env.BASE_BRANCH||"").trim();
// Cloudflare Pages branch aliases are truncated to 28 characters.
const BASE_URL=(BASE_BRANCH?`https://${BASE_BRANCH.slice(0,28).replace(/-+$/,"")}.jawed-website.pages.dev`:(process.env.BASE_URL||"https://jawed.co.in")).replace(/\/$/,"");
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
async function pressKey(selector,key){const e=await find(selector);await command("POST","/element/"+elementId(e)+"/value",{text:key,value:[key]});await sleep(180)}
async function type(selector,value){const e=await find(selector);const id=elementId(e);await command("POST","/element/"+id+"/clear",{});if(value!=="")await command("POST","/element/"+id+"/value",{text:value,value:[...value]});await sleep(180)}
async function clearAndDispatchInput(selector){await type(selector,"");await js("const e=document.querySelector(arguments[0]);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true",[selector]);await sleep(180)}
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
async function checkLink(selector,label){
  const state=await js("return (()=>{const e=document.querySelector(arguments[0]);if(!e)return {missing:true};e.scrollIntoView({block:'center',inline:'center',behavior:'instant'});const style=getComputedStyle(e),rects=[...e.getClientRects()];let hitInside=false,hitTag=null;for(const r of rects){if(r.width<1||r.height<1)continue;const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);hitTag=h?.tagName||null;if(h&&(h===e||e.contains(h))){hitInside=true;break}}return {missing:false,display:style.display,visibility:style.visibility,pointerEvents:style.pointerEvents,rects:rects.length,hitInside,hitTag,href:e.href}})()",[selector]);
  if(state.missing)throw new Error(label+": missing");
  if(state.display==="none"||state.visibility==="hidden"||state.rects<1)throw new Error(label+": not visibly rendered");
  if(state.pointerEvents==="none")throw new Error(label+": pointer-events:none");
  if(!state.hitInside)throw new Error(label+": link hit-test did not reach anchor (hit "+state.hitTag+")");
  if(!/^https?:/.test(state.href||""))throw new Error(label+": missing valid link destination");
}
async function assertRequiredInvalid(formSelector,inputSelector,label){const state=await js("const f=document.querySelector(arguments[0]),i=document.querySelector(arguments[1]);return {formValid:f.checkValidity(),valueMissing:i.validity.valueMissing}",[formSelector,inputSelector]);if(state.formValid||!state.valueMissing)throw new Error(label+": blank required input was not marked invalid: "+JSON.stringify(state))}
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
    ["/tools/personal-finance-snapshot/",'$(id).value.trim()===""||!Number.isFinite(n(id))||n(id)<0'],
    ["/tools/personal-finance-snapshot/",'$("finance-reset").addEventListener("click"'],
    ["/tools/finance-planning-workspace/",'if(!valid(fields))err="Retirement values must be zero or positive."'],
    ["/tools/ai-prompt-builder/",'Prompt built locally in your browser.'],
    ["/assets/js/interview-preparation-planner.js",'const sampleText="IT Support Engineer.'],
    ["/tools/it-troubleshooting-assistant/",'Can the device reach any known website or network resource?'],
    ["/tools/resume-bullet-strength-checker/",'const weak=[\'responsible for\''],
    ["/tools/service-desk-note-formatter/",'Note formatted locally in your browser.'],
    ["/tools/ticket-to-knowledge-base-draft/",'Draft built locally. Review and sanitize it before reuse.'],
    ["/notes/retirement-withdrawals-sequence-risk-income-review/",'Why the sequence of returns matters'],
    ["/notes/portfolio-allocation-rebalancing-framework/",'Worked example: calculate allocation drift'],
    ["/notes/us-stocks-etfs-starting-point/",'Worked example: two ETFs can still overlap'],
    ["/assets/js/main.js","const filters=[{input:'notes-filter'"],
    ["/topics/",'id="topics-filter"'],
    ["/tools/",'id="tools-filter"'],
    ["/resources/",'id="resources-filter"'],
    ["/notes/",'id="notes-filter"'],
    ["/blog/",'id="blog-filter"'],
    ["/notes/it-troubleshooting-guide-knowledge-base/",'Worked example: turn one ticket into a reusable guide']
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
  await type("#initial","150000");await pressKey("#initial","\uE007");
  const changed=await textOf("#future-value");
  if(!changed||changed==="—"||changed===baseline)throw new Error(label+" growth did not recalculate after changing initial amount");
  await click("#growth-reset");
  if(await valueOf("#initial")!=="100000")throw new Error(label+" growth reset did not restore its default input");
  if(await textOf("#future-value")!==baseline)throw new Error(label+" growth reset did not restore the default result");
  await type("#initial","");await submit("#growth-tool");await assertRequiredInvalid("#growth-tool","#initial",label+" growth");
  await click("#growth-reset");
}
async function testGoal(label){
  await openPage("/tools/inflation-goal-planning-calculator/","#cost");
  await checkControl("#goal-tool button[type='submit']",label+" goal submit");
  await checkControl("#goal-reset",label+" goal reset");
  const baseline=await textOf("#future");
  if(!baseline||baseline==="—")throw new Error(label+" goal default result is missing");
  await type("#cost","");await submit("#goal-tool");await assertRequiredInvalid("#goal-tool","#cost",label+" goal");
  await click("#goal-reset");
  if(await valueOf("#cost")!=="1000000"||await textOf("#future")!==baseline)throw new Error(label+" goal reset did not restore defaults and results");
}
async function testRetirement(label){
  await openPage("/tools/retirement-planning-calculator/","#age");
  await checkControl("#retirement-tool button[type='submit']",label+" retirement submit");
  await checkControl("#retirement-reset",label+" retirement reset");
  const baseline=await textOf("#required-corpus");
  if(!baseline||baseline==="—")throw new Error(label+" retirement default result is missing");
  await type("#age","");await submit("#retirement-tool");await assertRequiredInvalid("#retirement-tool","#age",label+" retirement");
  await click("#retirement-reset");
  if(await valueOf("#age")!=="45"||await textOf("#required-corpus")!==baseline)throw new Error(label+" retirement reset did not restore defaults and results");
}
async function testSnapshot(label){
  await openPage("/tools/personal-finance-snapshot/","#income");
  await checkControl("#finance-tool button[type='submit']",label+" snapshot submit");
  await checkControl("#finance-reset",label+" snapshot reset");
  const spending=await textOf("#spending"),netWorth=await textOf("#netWorth");
  if(spending.replace(/\s/g,"")!=="₹60,000"||netWorth.replace(/\s/g,"")!=="₹16,00,000")throw new Error(label+" snapshot default math mismatch: spending="+spending+", netWorth="+netWorth);
  await clearAndDispatchInput("#income");
  if(!(await textOf("#error")).includes("Enter zero or a positive number"))throw new Error(label+" snapshot blank input did not show validation feedback");
  if(await textOf("#spending")!=="—"||await textOf("#netWorth")!=="—")throw new Error(label+" snapshot blank input left stale outputs visible");
  await click("#finance-reset");
  const resetState={income:await valueOf("#income"),spending:await textOf("#spending"),netWorth:await textOf("#netWorth"),expectedSpending:spending,expectedNetWorth:netWorth};if(resetState.income!=="100000"||resetState.spending!==spending||resetState.netWorth!==netWorth)throw new Error(label+" snapshot reset mismatch: "+JSON.stringify(resetState));
}
async function testWorkspace(label){
  await openPage("/tools/finance-planning-workspace/","#tab-snapshot");
  for(const tab of ["#tab-snapshot","#tab-goals","#tab-retirement","#tab-review"])await checkControl(tab,label+" workspace "+tab);
  const assertActiveTab=async(id)=>{const state=await js("const e=document.querySelector(arguments[0]);return {focused:document.activeElement?.id===e?.id,selected:e?.getAttribute('aria-selected'),visible:!document.querySelector(e?.getAttribute('aria-controls'))?.hidden}",["#"+id]);if(!state.focused||state.selected!=="true"||!state.visible)throw new Error(label+" workspace keyboard navigation failed for "+id+": "+JSON.stringify(state));};
  await pressKey("#tab-snapshot","\uE014");
  await assertActiveTab("tab-goals");
  await pressKey("#tab-goals","\uE014");
  await assertActiveTab("tab-retirement");
  await pressKey("#tab-retirement","\uE012");
  await assertActiveTab("tab-goals");
  await pressKey("#tab-goals","\uE011");
  await assertActiveTab("tab-snapshot");
  await pressKey("#tab-snapshot","\uE010");
  await assertActiveTab("tab-review");
  const spending=await textOf("#spending"),surplus=await textOf("#surplus"),netWorth=await textOf("#netWorth");
  if(spending.replace(/\s/g,"")!=="₹60,000"||surplus.replace(/\s/g,"")!=="₹40,000"||netWorth.replace(/\s/g,"")!=="₹0")throw new Error(label+" workspace snapshot defaults mismatch");
  await click("#tab-goals");
  if(await textOf("#futureGoal")==="—"||await textOf("#futureValue")==="—")throw new Error(label+" workspace goal/growth defaults missing");
  await click("#tab-retirement");
  const baseline=await textOf("#requiredCorpus");
  if(!baseline||baseline==="—")throw new Error(label+" workspace retirement default result missing");
  await clearAndDispatchInput("#retSpending");
  const retirementError=await js("const e=document.querySelector('#retError');return {role:e?.getAttribute('role'),live:e?.getAttribute('aria-live'),atomic:e?.getAttribute('aria-atomic'),text:e?.textContent||''}");
  if(retirementError.role!=="alert"||retirementError.live!=="assertive"||retirementError.atomic!=="true"||!retirementError.text.includes("Retirement values must be zero or positive."))throw new Error(label+" workspace retirement validation announcement contract failed: "+JSON.stringify(retirementError));
  if(await textOf("#requiredCorpus")!=="—")throw new Error(label+" workspace retirement blank input left a stale result");
  await type("#retSpending","720000");
  await js("const e=document.querySelector(arguments[0]);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true",["#retSpending"]);
  await sleep(200);
  if(await textOf("#retError")!==""||await textOf("#requiredCorpus")==="—")throw new Error(label+" workspace retirement result did not recover after valid input");
  await click("#tab-review");
  if(await js("return document.querySelector('#review').hidden")!==false)throw new Error(label+" workspace Review tab did not activate");
  await click("#tab-snapshot");
}
async function testPromptBuilder(label){
  await openPage("/tools/ai-prompt-builder/","#prompt-goal");
  await checkControl("#prompt-tool button[type=submit]",label+" prompt builder submit");
  await checkControl("#prompt-clear",label+" prompt builder clear");
  await type("#prompt-goal","Draft a concise troubleshooting checklist");
  await type("#prompt-context","For first-line IT support");
  await submit("#prompt-tool");
  const output=await textOf("#prompt-generated-output");
  if(!output.includes("Goal: Draft a concise troubleshooting checklist")||!output.includes("Context: For first-line IT support"))throw new Error(label+" prompt builder output mismatch");
  await click("#prompt-clear");
  if(await valueOf("#prompt-goal")!==""||!(await textOf("#prompt-generated-output")).includes("Your prompt will appear here."))throw new Error(label+" prompt builder clear did not reset state");
}
async function testInterviewPlanner(label){
  await openPage("/tools/interview-preparation-planner/","#jd");
  await checkControl("#plan",label+" interview planner build");
  await checkControl("#sample",label+" interview planner sample");
  await checkControl("#clear",label+" interview planner clear");
  await click("#sample");
  if(!(await textOf("#results")).includes("Interview preparation plan"))throw new Error(label+" interview planner sample did not build a plan");
  await click("#clear");
  if(await valueOf("#jd")!==""||!(await textOf("#results")).includes("Paste a job description"))throw new Error(label+" interview planner clear did not restore the empty state");
  await type("#jd","Short description");
  await click("#plan");
  if(!(await textOf("#results")).includes("at least 80 characters"))throw new Error(label+" interview planner did not request sufficient job-description detail");
}
async function testTroubleshooting(label){
  await openPage("/tools/it-troubleshooting-assistant/","#symptom");
  await checkControl("#trouble-tool button[type=submit]",label+" troubleshooting submit");
  await checkControl("#clear",label+" troubleshooting clear");
  const startPath=async(category,symptom)=>{
    await type("#symptom",symptom);
    await js("const e=document.querySelector('#type');e.value=arguments[0];e.dispatchEvent(new Event('change',{bubbles:true}));return true",[category]);
    await submit("#trouble-tool");
  };
  await startPath("network","Device cannot reach any website after reconnecting to Wi-Fi.");
  if(!(await textOf("#result")).includes("Can the device reach any known website"))throw new Error(label+" troubleshooting network path did not start");
  await click("#result [data-answer=yes]");
  if(!(await textOf("#result")).includes("Can the device resolve a known domain name"))throw new Error(label+" troubleshooting network answer did not advance to DNS");
  await click("#clear");
  if(await valueOf("#symptom")!==""||await js("return document.querySelectorAll('#result [data-answer]').length")!==0)throw new Error(label+" troubleshooting clear did not reset the decision path");

  await startPath("microsoft","User cannot sign in to a Microsoft 365 application.");
  if(!(await textOf("#result")).includes("Does the sign-in problem occur"))throw new Error(label+" Microsoft troubleshooting start question missing");
  await click("#result [data-answer=yes]");
  if(!(await textOf("#result")).includes("Do other users have the same sign-in or service symptom?"))throw new Error(label+" Microsoft yes branch did not reach shared-service scope");
  await click("#result [data-answer=yes]");
  if(!(await textOf("#result")).includes("Multiple users are affected."))throw new Error(label+" Microsoft shared-service outcome missing");
  const microsoftFocus=await js("return document.activeElement===document.querySelector('#result')");
  if(!microsoftFocus)throw new Error(label+" Microsoft final outcome did not receive focus");
  await click("#clear");

  await startPath("apple","Mac application stopped behaving as expected.");
  await click("#result [data-answer=yes]");
  if(!(await textOf("#result")).includes("Was there a recent update, configuration or application change?"))throw new Error(label+" Apple yes branch did not reach change comparison");
  await click("#result [data-answer=no]");
  if(!(await textOf("#result")).includes("No known change."))throw new Error(label+" Apple no-change outcome missing");
  await click("#clear");

  await startPath("windows","Windows application stopped behaving as expected.");
  await click("#result [data-answer=yes]");
  if(!(await textOf("#result")).includes("Did the problem begin after a recent update, configuration or application change?"))throw new Error(label+" Windows yes branch did not reach change comparison");
  await click("#result [data-answer=no]");
  if(!(await textOf("#result")).includes("No known change."))throw new Error(label+" Windows no-change outcome missing");
  await click("#clear");

  await startPath("general","An IT issue affects one user.");
  await click("#result [data-answer=yes]");
  if(!(await textOf("#result")).includes("The issue follows the user across contexts."))throw new Error(label+" general IT user-scope outcome missing");
  await click("#clear");
  if(await valueOf("#symptom")!==""||await js("return document.querySelectorAll('#result [data-answer]').length")!==0)throw new Error(label+" troubleshooting final reset did not restore the empty state");
}
async function testBulletChecker(label){
  await openPage("/tools/resume-bullet-strength-checker/","#bullets");
  await checkControl("#check",label+" bullet checker run");
  await checkControl("#sample",label+" bullet checker sample");
  await checkControl("#clear",label+" bullet checker clear");
  await click("#sample");
  const output=await textOf("#results");
  if(!output.includes("average strength")||!output.includes("Bullet 1:")||!output.includes("4 bullets checked locally."))throw new Error(label+" bullet checker did not produce expected sample results");
  await click("#clear");
  if(await valueOf("#bullets")!==""||!(await textOf("#results")).includes("Paste your bullets"))throw new Error(label+" bullet checker clear did not reset state");
}
async function testNoteFormatter(label){
  await openPage("/tools/service-desk-note-formatter/","#note-issue");
  await checkControl("#note-tool button[type=submit]",label+" note formatter submit");
  await checkControl("#note-clear",label+" note formatter clear");
  await type("#note-issue","User cannot connect to the corporate VPN.");
  await type("#note-actions","Verified network connectivity and collected the exact error.");
  await submit("#note-tool");
  const output=await textOf("#note-output");
  if(!output.includes("Issue / Request: User cannot connect to the corporate VPN.")||!output.includes("Actions Taken: Verified network connectivity"))throw new Error(label+" note formatter output mismatch");
  await click("#note-clear");
  if(await valueOf("#note-issue")!==""||!(await textOf("#note-output")).includes("Your formatted note will appear here."))throw new Error(label+" note formatter clear did not reset state");
}
async function testKnowledgeBaseDraft(label){
  await openPage("/tools/ticket-to-knowledge-base-draft/","#kb-problem");
  await checkControl("#kb-tool button[type=submit]",label+" KB draft submit");
  await checkControl("#kb-clear",label+" KB draft clear");
  await type("#kb-problem","VPN connection fails after password reset");
  await type("#kb-scope","Managed macOS devices with approved VPN client");
  await submit("#kb-tool");
  const output=await textOf("#kb-output");
  if(!output.includes("Problem:\nVPN connection fails after password reset")||!output.includes("Validation:\n[Add verified information before publishing]"))throw new Error(label+" KB draft output or safe placeholder mismatch");
  await click("#kb-clear");
  if(await valueOf("#kb-problem")!==""||!(await textOf("#kb-output")).includes("Your draft will appear here."))throw new Error(label+" KB draft clear did not reset state");
}

async function testContentDiscovery(label){
  const cases=[
    {path:"/tools/",input:"#tools-filter",reset:'[data-reset-filter="tools-filter"]',status:"#tools-filter-status",query:"finance",kind:"tool results"},
    {path:"/topics/",input:"#topics-filter",reset:'[data-reset-filter="topics-filter"]',status:"#topics-filter-status",query:"Apple",kind:"topic results"},
    {path:"/resources/",input:"#resources-filter",reset:'[data-reset-filter="resources-filter"]',status:"#resources-filter-status",query:"Apple",kind:"resource results"},
    {path:"/notes/",input:"#notes-filter",reset:'[data-reset-filter="notes-filter"]',status:"#notes-filter-status",query:"Jamf",kind:"note results"},
    {path:"/blog/",input:"#blog-filter",reset:'[data-reset-filter="blog-filter"]',status:"#blog-filter-status",query:"triage",kind:"post results"}
  ];
  for(const item of cases){
    await openPage(item.path,item.input);
    await checkControl(item.input,label+" "+item.kind+" search");
    await checkControl(item.reset,label+" "+item.kind+" clear");
    if(!(await textOf(item.status)).startsWith("Showing all"))throw new Error(label+" "+item.kind+" initial status is incorrect");
    await type(item.input,item.query);
    const filtered=await textOf(item.status);
    if(!filtered.includes("matching")||!filtered.includes(item.kind))throw new Error(label+" "+item.kind+" search did not update status: "+filtered);
    const query=await js("return new URL(window.location.href).searchParams.get('q')");
    if(query!==item.query)throw new Error(label+" "+item.kind+" search did not synchronize the URL query");
    await pressKey(item.reset,"\uE007");
    const resetState=await js("return {inputFocused:document.activeElement===document.querySelector(arguments[1]),input:document.querySelector(arguments[1])?.value||'',status:document.querySelector(arguments[2])?.textContent.trim()||''}",[item.reset,item.input,item.status]);
    if(!resetState.inputFocused||resetState.input!==""||!resetState.status.startsWith("Showing all"))throw new Error(label+" "+item.kind+" keyboard clear did not reset results and return focus to search: "+JSON.stringify(resetState));
    const clearedQuery=await js("return new URL(window.location.href).searchParams.get('q')");
    if(clearedQuery!==null)throw new Error(label+" "+item.kind+" clear left a stale URL query");
  }
}

async function testKnowledgeBaseNote(label){
  await openPage("/notes/it-troubleshooting-guide-knowledge-base/","main h1");
  const title=await textOf("main h1");
  if(title!=="Writing Better IT Troubleshooting Guides: From Incident to Knowledge Base")throw new Error(label+" knowledge-base note title mismatch: "+title);
  const mainText=await textOf("main");
  for(const phrase of [
    "Worked example: turn one ticket into a reusable guide",
    "Illustrative example only; not a record of a real user or employer.",
    "The cause has not been confirmed.",
    "Do not state that the password reset caused the failure."
  ])if(!mainText.includes(phrase))throw new Error(label+" knowledge-base note is missing expected visible content: "+phrase);
  const dates=await js("return [...document.querySelectorAll('main .meta')].map(e=>e.textContent.trim())");
  if(!dates.some(value=>value.includes("Published: 2026-09-29")&&value.includes("Updated: 2026-10-13")))throw new Error(label+" knowledge-base note visible publication/update dates are missing or stale: "+JSON.stringify(dates));
  const headingState=await js("const e=[...document.querySelectorAll('main h2')].find(x=>x.textContent.trim()==='Worked example: turn one ticket into a reusable guide');if(!e)return null;const s=getComputedStyle(e);const r=e.getBoundingClientRect();return {display:s.display,visibility:s.visibility,width:r.width,height:r.height}");
  if(!headingState||headingState.display==="none"||headingState.visibility==="hidden"||headingState.width<1||headingState.height<1)throw new Error(label+" knowledge-base worked-example heading is not visibly rendered");
}

async function testRetirementWithdrawalsGuide(label){
  await openPage("/notes/retirement-withdrawals-sequence-risk-income-review/","main h1");
  const heading=await textOf("main h1");
  if(heading!=="Retirement Withdrawals: Sequence Risk, Income and Annual Reviews")throw new Error(label+" retirement withdrawal guide heading mismatch");
  const table=await textOf("main table tbody");
  if(!table.includes("₹78L")||!table.includes("₹74L"))throw new Error(label+" retirement sequence-risk example values are missing");
  const meta=await js("const s=JSON.parse(document.querySelector('script[type=\"application/ld+json\"]')?.textContent||'{}');return {type:s['@type'],headline:s.headline,canonical:s.mainEntityOfPage?.['@id'],published:s.datePublished,modified:s.dateModified}");
  if(meta.type!=="Article"||meta.headline!=="Retirement Withdrawals: Sequence Risk, Income and Annual Reviews"||meta.canonical!=="https://jawed.co.in/notes/retirement-withdrawals-sequence-risk-income-review/"||meta.published!=="2026-10-12"||meta.modified!=="2026-10-13")throw new Error(label+" retirement withdrawal guide metadata mismatch: "+JSON.stringify(meta));
  await checkLink('main a[href^="https://pfrda.org.in"]',label+" PFRDA reference");
  await checkLink('main a[href^="https://www.investor.gov"]',label+" general retirement reference");
  await checkLink('main a[href="/notes/retirement-corpus-calculation-framework/"]',label+" related corpus note");
  await checkLink('main a[href="/tools/retirement-planning-calculator/"]',label+" retirement calculator");
  if(!(await textOf("main .financial-disclosure")).includes("not a SEBI-registered Investment Adviser"))throw new Error(label+" financial disclosure is missing");
}

async function testPortfolioAllocationGuide(label){
  await openPage("/notes/portfolio-allocation-rebalancing-framework/","main h1");
  const heading=await textOf("main h1");
  if(heading!=="Portfolio Allocation and Rebalancing: A Practical Framework")throw new Error(label+" portfolio allocation guide heading mismatch");
  const table=await textOf("main table tbody");
  for(const value of ["₹6.8 lakh","₹2.2 lakh","+8 percentage points","−8 percentage points","100%"]){
    if(!table.includes(value))throw new Error(label+" portfolio allocation worked example missing "+value);
  }
  const meta=await js("const s=JSON.parse(document.querySelector('script[type=\"application/ld+json\"]')?.textContent||'{}');return {type:s['@type'],headline:s.headline,canonical:s.mainEntityOfPage?.['@id'],published:s.datePublished,modified:s.dateModified}");
  if(meta.type!=="Article"||meta.headline!=="Portfolio Allocation and Rebalancing: A Practical Framework"||meta.canonical!=="https://jawed.co.in/notes/portfolio-allocation-rebalancing-framework/"||meta.published!=="2026-09-28"||meta.modified!=="2026-10-12")throw new Error(label+" portfolio allocation guide metadata mismatch: "+JSON.stringify(meta));
  await checkLink('main a[href^="https://www.investor.gov"]',label+" Investor.gov asset allocation reference");
  await checkLink('main a[href="/notes/us-stocks-etfs-starting-point/"]',label+" US investing related note");
  await checkLink('main a[href="/notes/indian-mutual-funds-index-etfs-starting-point/"]',label+" India investing related note");
  if(!(await textOf("main .financial-disclosure")).includes("not a SEBI-registered Investment Adviser"))throw new Error(label+" portfolio financial disclosure is missing");
}

async function testUsStocksEtfsGuide(label){
  await openPage("/notes/us-stocks-etfs-starting-point/","main h1");
  const heading=await textOf("main h1");
  if(heading!=="US Stocks and ETFs: A Practical Starting Point")throw new Error(label+" US stocks/ETF guide heading mismatch");
  const table=await textOf("main table tbody");
  for(const value of ["₹5 lakh","50%","40%","₹2.5 lakh (25%)","₹2.0 lakh (20%)","₹4.5 lakh (45%)"]){
    if(!table.includes(value))throw new Error(label+" ETF overlap example missing "+value);
  }
  const meta=await js("const s=JSON.parse(document.querySelector('script[type=\"application/ld+json\"]')?.textContent||'{}');return {type:s['@type'],headline:s.headline,canonical:s.mainEntityOfPage?.['@id'],published:s.datePublished,modified:s.dateModified}");
  if(meta.type!=="Article"||meta.headline!=="US Stocks and ETFs: A Practical Starting Point"||meta.canonical!=="https://jawed.co.in/notes/us-stocks-etfs-starting-point/"||meta.published!=="2026-09-28"||meta.modified!=="2026-10-12")throw new Error(label+" US stocks/ETF guide metadata mismatch: "+JSON.stringify(meta));
  await checkLink('main a[href^="https://www.investor.gov"]',label+" Investor.gov reference");
  await checkLink('main a[href="/notes/portfolio-allocation-rebalancing-framework/"]',label+" portfolio allocation related note");
  await checkLink('main a[href="/notes/indian-mutual-funds-index-etfs-starting-point/"]',label+" Indian funds related note");
  if(!(await textOf("main .financial-disclosure")).includes("not a SEBI-registered Investment Adviser"))throw new Error(label+" US stocks/ETF financial disclosure is missing");
}

async function testJawedAiWidget(label){
  await openPage("/", "body");
  await waitForElement("[data-jawed-ai-widget] .jawed-ai-toggle");
  await sleep(500);
  const initial=await js("const p=document.querySelector('#jawed-ai-panel'),t=document.querySelector('.jawed-ai-toggle');return {panelExists:!!p,hidden:p?.hidden,expanded:t?.getAttribute('aria-expanded'),focused:document.activeElement===t}");
  if(!initial.panelExists||!initial.hidden||initial.expanded!=="false")throw new Error(label+" AI widget should start closed without auto-opening: "+JSON.stringify(initial));
  await click(".jawed-ai-toggle");
  const opened=await js("const p=document.querySelector('#jawed-ai-panel'),t=document.querySelector('.jawed-ai-toggle'),i=p?.querySelector('input[name=question]');return {hidden:p?.hidden,expanded:t?.getAttribute('aria-expanded'),inputFocused:document.activeElement===i,dialog:p?.getAttribute('role'),modal:p?.getAttribute('aria-modal')}");
  if(opened.hidden||opened.expanded!=="true"||!opened.inputFocused||opened.dialog!=="dialog"||opened.modal!=="false")throw new Error(label+" AI widget open/focus/dialog contract failed: "+JSON.stringify(opened));
  await pressKey('input[name="question"]',"\uE00C");
  const escaped=await js("const p=document.querySelector('#jawed-ai-panel'),t=document.querySelector('.jawed-ai-toggle');return {hidden:p?.hidden,expanded:t?.getAttribute('aria-expanded'),toggleFocused:document.activeElement===t}");
  if(!escaped.hidden||escaped.expanded!=="false"||!escaped.toggleFocused)throw new Error(label+" AI widget Escape must close and return focus to toggle: "+JSON.stringify(escaped));
  await pressKey(".jawed-ai-toggle","\uE007");
  const reopened=await js("const p=document.querySelector('#jawed-ai-panel'),i=p?.querySelector('input[name=question]');return {hidden:p?.hidden,inputFocused:document.activeElement===i}");
  if(reopened.hidden||!reopened.inputFocused)throw new Error(label+" AI widget keyboard activation did not open/focus input: "+JSON.stringify(reopened));
  await click(".jawed-ai-close");
  const closed=await js("const p=document.querySelector('#jawed-ai-panel'),t=document.querySelector('.jawed-ai-toggle');return {hidden:p?.hidden,expanded:t?.getAttribute('aria-expanded'),toggleFocused:document.activeElement===t}");
  if(!closed.hidden||closed.expanded!=="false"||!closed.toggleFocused)throw new Error(label+" AI widget close button must close and return focus: "+JSON.stringify(closed));
}

async function testMobileNavigationKeyboard(label){
  if(!label.startsWith("390x"))return;
  await openPage("/", "body");
  await waitForElement(".menu-toggle");
  const initial=await js("const b=document.querySelector('.menu-toggle'),n=document.querySelector('#site-nav');return {expanded:b?.getAttribute('aria-expanded'),open:n?.classList.contains('is-open'),controls:b?.getAttribute('aria-controls'),navId:n?.id}");
  if(initial.expanded!=="false"||initial.open||initial.controls!=="site-nav"||initial.navId!=="site-nav")throw new Error(label+" mobile navigation initial state/relationship mismatch: "+JSON.stringify(initial));
  await click(".menu-toggle");
  const opened=await js("const b=document.querySelector('.menu-toggle'),n=document.querySelector('#site-nav');return {expanded:b?.getAttribute('aria-expanded'),open:n?.classList.contains('is-open')}");
  if(opened.expanded!=="true"||!opened.open)throw new Error(label+" mobile navigation did not open: "+JSON.stringify(opened));
  await pressKey(".menu-toggle","\uE00C");
  const escaped=await js("const b=document.querySelector('.menu-toggle'),n=document.querySelector('#site-nav');return {expanded:b?.getAttribute('aria-expanded'),open:n?.classList.contains('is-open'),focused:document.activeElement===b}");
  if(escaped.expanded!=="false"||escaped.open||!escaped.focused)throw new Error(label+" Escape did not close mobile navigation and restore focus: "+JSON.stringify(escaped));
  await pressKey(".menu-toggle","\uE007");
  const reopened=await js("const b=document.querySelector('.menu-toggle'),n=document.querySelector('#site-nav');return {expanded:b?.getAttribute('aria-expanded'),open:n?.classList.contains('is-open')}");
  if(reopened.expanded!=="true"||!reopened.open)throw new Error(label+" Enter did not reopen mobile navigation: "+JSON.stringify(reopened));
  await click("#site-nav .nav-group summary");
  await click("#site-nav a[href='/notes/']");
  const closed=await js("const b=document.querySelector('.menu-toggle'),n=document.querySelector('#site-nav');return {expanded:b?.getAttribute('aria-expanded'),open:n?.classList.contains('is-open'),path:location.pathname}");
  if(closed.expanded!=="false"||closed.open||closed.path!=="/notes/")throw new Error(label+" choosing a navigation link did not close the menu/navigate correctly: "+JSON.stringify(closed));
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
    await testWorkspace(label);
    await testPromptBuilder(label);
    await testInterviewPlanner(label);
    await testTroubleshooting(label);
    await testBulletChecker(label);
    await testNoteFormatter(label);
    await testKnowledgeBaseDraft(label);
    await testContentDiscovery(label);
    await testJawedAiWidget(label);
    await testMobileNavigationKeyboard(label);
    await testRetirementWithdrawalsGuide(label);
    await testPortfolioAllocationGuide(label);
    await testUsStocksEtfsGuide(label);
    await testKnowledgeBaseNote(label);
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
