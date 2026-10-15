import {spawn} from "node:child_process";
import {writeFile,unlink} from "node:fs/promises";

const BASE_BRANCH=(process.env.BASE_BRANCH||"").trim();
const BASE_URL=(BASE_BRANCH?`https://${BASE_BRANCH.slice(0,28).replace(/-+$/, "")}.jawed-website.pages.dev`:(process.env.BASE_URL||"https://jawed.co.in")).replace(/\/$/,"");
const CHROMEDRIVER=process.env.CHROMEDRIVER||"chromedriver";
const uploadFixture="/tmp/career-match-upload-fixture.txt";
const uploadText="Browser upload fixture with enough plain text words to satisfy the resume validation threshold in this deterministic browser test. This is fictional sample content only.";
const failures=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let driver=null,sessionId=null,stage="initializing";

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
async function js(script,args=[]){return command("POST","/execute/sync",{script,args})}
async function waitForElement(selector,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){try{await find(selector);return}catch{}await sleep(100)}throw new Error("Timed out waiting for element "+selector)}
async function waitFor(expression,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(await js("return ("+expression+")();"))return;await sleep(100)}throw new Error("Timed out waiting for "+expression)}
async function find(selector){return command("POST","/element",{using:"css selector",value:selector})}
const elementId=e=>e["element-6066-11e4-a52e-4f735466cecf"]||e.ELEMENT;
async function click(selector){const e=await find(selector);await command("POST","/element/"+elementId(e)+"/click",{});await sleep(150)}
async function pressKey(selector,key){const e=await find(selector);await command("POST","/element/"+elementId(e)+"/value",{text:key,value:[key]});await sleep(150)}
async function type(selector,value){const e=await find(selector);const id=elementId(e);await command("POST","/element/"+id+"/clear",{});await command("POST","/element/"+id+"/value",{text:value,value:[...value]})}
async function upload(selector,path){const e=await find(selector);await command("POST","/element/"+elementId(e)+"/value",{text:path,value:[...path]});await sleep(500)}
async function hitTest(selector){
  return js('return (()=>{const e=document.querySelector(arguments[0]);if(!e)return {missing:true};document.documentElement.style.setProperty("scroll-behavior","auto","important");e.scrollIntoView({block:"center",inline:"center",behavior:"instant"});const r=e.getBoundingClientRect();const x=r.left+r.width/2;const y=r.top+r.height/2;const h=document.elementFromPoint(x,y);return {missing:false,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,pointerEvents:getComputedStyle(e).pointerEvents,top:r.top,left:r.left,width:r.width,height:r.height,hitTag:h?.tagName||null,hitId:h?.id||null,hitClass:typeof h?.className==="string"?h.className:"",hitInside:!!h&&(h===e||e.contains(h))}})()',[selector]);
}
async function checkControl(selector,label){
  const h=await hitTest(selector);
  if(h.missing)throw new Error(label+": missing");
  if(h.display==="none"||h.visibility==="hidden"||h.width<1||h.height<1)throw new Error(label+": not visibly interactable");
  if(h.pointerEvents==="none")throw new Error(label+": pointer-events:none");
  if(!h.hitInside)throw new Error(label+": center hit is "+h.hitTag+"#"+(h.hitId||"")+"."+(h.hitClass||"")+" at "+JSON.stringify({top:h.top,left:h.left,width:h.width,height:h.height}));
}
async function assertNoHorizontalOverflow(label,stage){
  const state=await js("return {viewport:document.documentElement.clientWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}");
  if(state.document>state.viewport+1||state.body>state.viewport+1)throw new Error(label+" "+stage+" has horizontal overflow: "+JSON.stringify(state));
}
async function runViewport(width,height){
  const caps={capabilities:{alwaysMatch:{browserName:"chrome",pageLoadStrategy:"none","goog:loggingPrefs":{browser:"ALL"},"goog:chromeOptions":{args:["--headless=new","--no-sandbox","--disable-dev-shm-usage","--window-size="+width+","+height]}}}};
  const created=await http("POST","/session",caps); sessionId=created.sessionId;
  try{
    await command("POST","/url",{url:BASE_URL+"/tools/career-match-resume-review/"});
    try{await waitForElement("#file")}catch(error){let current="unknown",source="",logs=[];try{current=await command("GET","/url")}catch{}try{source=await command("GET","/source")}catch{}try{logs=await command("POST","/log",{type:"browser"})}catch{}throw new Error("page did not expose #file; url="+JSON.stringify(current)+" sourceLength="+String(source?.length||0)+" hasFileMarkup="+String(String(source).includes('id="file"'))+" logs="+JSON.stringify(logs?.slice?.(-12)||[]));} await sleep(700);
    stage="motion and forced-colors stylesheet contract";
    const accessibilityCss=await js("const css=document.querySelector('style')?.textContent||'';return {reduced:css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('animation:none!important')&&css.includes('transition:none!important')&&css.includes('scroll-behavior:auto!important'),forced:css.includes('@media(forced-colors:active)')&&css.includes('CanvasText')&&css.includes('ButtonFace')&&css.includes('HighlightText')}");
    if(!accessibilityCss.reduced)failures.push(width+"x"+height+" reduced-motion CSS contract is missing or incomplete");
    if(!accessibilityCss.forced)failures.push(width+"x"+height+" forced-colors CSS contract is missing or incomplete");
    const label=width+"x"+height;
    await assertNoHorizontalOverflow(label,"initial page");
    console.log("Viewport "+label+": loaded");
    stage="control hit tests";
    for(const s of ["#theme","#sample","#go","#file","#tab-analyze","#tab-results","#tab-tracker","#tab-saved"]){
      try{await checkControl(s,s)}catch(e){failures.push(width+"x"+height+" "+e.message)}
    }
    const assertActiveTab=async(id)=>{const state=await js("const e=document.querySelector(arguments[0]);const panel=document.getElementById(e?.getAttribute('aria-controls'));return {focused:document.activeElement?.id===e?.id,focusVisible:!!e&&e.matches(':focus-visible'),selected:e?.getAttribute('aria-selected'),panelVisible:!!panel&&!panel.hidden&&panel.getAttribute('aria-hidden')==='false'}",["#"+id]);if(!state.focused||!state.focusVisible||state.selected!=="true"||!state.panelVisible)throw new Error(width+"x"+height+" tab keyboard navigation/focus visibility failed for "+id+": "+JSON.stringify(state));};
    stage="keyboard tab navigation";
    await pressKey("#tab-analyze","\uE014"); await assertActiveTab("tab-results");
    await pressKey("#tab-results","\uE014"); await assertActiveTab("tab-tracker");
    await pressKey("#tab-tracker","\uE012"); await assertActiveTab("tab-results");
    await pressKey("#tab-results","\uE011"); await assertActiveTab("tab-analyze");
    await pressKey("#tab-analyze","\uE010"); await assertActiveTab("tab-saved");
    stage="restore analyze panel after keyboard navigation";
    await click("#tab-analyze"); await waitFor('()=>!document.querySelector("#v-analyze").hidden');
    stage="theme click and keyboard activation";
    const before=await js("return document.documentElement.dataset.theme||''"); await click("#theme");
    const after=await js("return document.documentElement.dataset.theme||''");
    if(before===after)failures.push(width+"x"+height+" #theme: click did not toggle theme");
    await pressKey("#theme","\uE007");
    const keyboardAfter=await js("return {theme:document.documentElement.dataset.theme||'',focused:document.activeElement?.id==='theme',focusVisible:document.querySelector('#theme')?.matches(':focus-visible')}");
    if(keyboardAfter.theme!==before)failures.push(width+"x"+height+" #theme: Enter key did not activate the focused theme button");
    if(!keyboardAfter.focused||!keyboardAfter.focusVisible)failures.push(width+"x"+height+" #theme: keyboard focus was not retained or not visibly indicated: "+JSON.stringify(keyboardAfter));
    stage="keyboard validation focus and error association";
    await pressKey("#go","\uE007");
    const invalid=await js("const e=document.querySelector('#err'),r=document.querySelector('#resume'),j=document.querySelector('#jd');return {role:e?.getAttribute('role'),live:e?.getAttribute('aria-live'),atomic:e?.getAttribute('aria-atomic'),text:e?.textContent||'',focusedResume:document.activeElement===r,focusVisible:r?.matches(':focus-visible'),resumeInvalid:r?.getAttribute('aria-invalid'),resumeDescribedBy:r?.getAttribute('aria-describedby')||'',jobInvalid:j?.getAttribute('aria-invalid'),jobDescribedBy:j?.getAttribute('aria-describedby')||'',resultsHidden:!!document.querySelector('#v-results')?.hidden,resultsCount:document.querySelectorAll('#results .card').length}");
    if(invalid.role!=="alert"||invalid.live!=="assertive"||invalid.atomic!=="true"||!invalid.text.includes("Please provide both a resume and a job description")||!invalid.focusedResume||!invalid.focusVisible||invalid.resumeInvalid!=="true"||!invalid.resumeDescribedBy.split(/\s+/).includes("err")||invalid.jobInvalid!=="true"||!invalid.jobDescribedBy.split(/\s+/).includes("err")||!invalid.resultsHidden||invalid.resultsCount)failures.push(width+"x"+height+" invalid-input focus/error association contract failed: "+JSON.stringify(invalid));
    stage="partial validation recovery";
    await type("#resume","Resume text with enough ordinary words to satisfy the minimum validation threshold for this browser regression test and confirm correction recovery.");
    const partial=await js("const e=document.querySelector('#err'),r=document.querySelector('#resume'),j=document.querySelector('#jd');return {text:e?.textContent||'',resumeInvalid:r?.getAttribute('aria-invalid')||'',resumeDescribedBy:r?.getAttribute('aria-describedby')||'',jobInvalid:j?.getAttribute('aria-invalid')||'',jobDescribedBy:j?.getAttribute('aria-describedby')||''}");
    if(partial.text!=="Please provide at least ~20 words in the job description."||partial.resumeInvalid||partial.resumeDescribedBy.split(/\s+/).includes("err")||partial.jobInvalid!=="true"||!partial.jobDescribedBy.split(/\s+/).includes("err"))failures.push(width+"x"+height+" partial input correction did not update remaining validation state: "+JSON.stringify(partial));
    stage="complete validation recovery";
    await type("#jd","Job description text with enough ordinary words to satisfy the minimum validation threshold for this browser regression test and confirm the summary clears after correction.");
    const recovered=await js("const e=document.querySelector('#err'),r=document.querySelector('#resume'),j=document.querySelector('#jd');return {text:e?.textContent||'',resumeInvalid:r?.getAttribute('aria-invalid')||'',resumeDescribedBy:r?.getAttribute('aria-describedby')||'',jobInvalid:j?.getAttribute('aria-invalid')||'',jobDescribedBy:j?.getAttribute('aria-describedby')||''}");
    if(recovered.text||recovered.resumeInvalid||recovered.resumeDescribedBy.split(/\s+/).includes("err")||recovered.jobInvalid||recovered.jobDescribedBy.split(/\s+/).includes("err"))failures.push(width+"x"+height+" valid input correction did not clear validation state: "+JSON.stringify(recovered));
    stage="resume file upload validation recovery";
    await type("#resume","");
    await type("#jd","");
    await pressKey("#go","\uE007");
    await upload("#file",uploadFixture);
    await waitFor("()=>document.querySelector('#fileMsg')?.textContent.startsWith('Loaded career-match-upload-fixture.txt')");
    const uploaded=await js("const e=document.querySelector('#err'),r=document.querySelector('#resume'),j=document.querySelector('#jd'),f=document.querySelector('#fileMsg');return {resume:r.value,job:j.value,message:e?.textContent||'',resumeInvalid:r.getAttribute('aria-invalid')||'',resumeDescribedBy:r.getAttribute('aria-describedby')||'',jobInvalid:j.getAttribute('aria-invalid')||'',jobDescribedBy:j.getAttribute('aria-describedby')||'',fileStatus:f?.textContent||'',fileRole:f?.getAttribute('role'),fileLive:f?.getAttribute('aria-live')}");
    if(uploaded.resume.trim().split(/\s+/).length<20||uploaded.message!=="Please provide at least ~20 words in the job description."||uploaded.resumeInvalid||uploaded.resumeDescribedBy.split(/\s+/).includes("err")||uploaded.jobInvalid!=="true"||!uploaded.jobDescribedBy.split(/\s+/).includes("err")||!uploaded.fileStatus.startsWith("Loaded career-match-upload-fixture.txt")||uploaded.fileRole!=="status"||uploaded.fileLive!=="polite")failures.push(width+"x"+height+" file upload did not recover resume validation or announce file status: "+JSON.stringify(uploaded));
    await type("#jd","Job description text with enough ordinary words to satisfy the minimum validation threshold for this browser regression test and confirm upload recovery.");
    const uploadRecovered=await js("const e=document.querySelector('#err'),r=document.querySelector('#resume'),j=document.querySelector('#jd');return {message:e?.textContent||'',resumeInvalid:r?.getAttribute('aria-invalid')||'',resumeDescribedBy:r?.getAttribute('aria-describedby')||'',jobInvalid:j?.getAttribute('aria-invalid')||'',jobDescribedBy:j?.getAttribute('aria-describedby')||''}");
    if(uploadRecovered.message||uploadRecovered.resumeInvalid||uploadRecovered.resumeDescribedBy.split(/\s+/).includes("err")||uploadRecovered.jobInvalid||uploadRecovered.jobDescribedBy.split(/\s+/).includes("err"))failures.push(width+"x"+height+" upload followed by valid job description did not clear validation state: "+JSON.stringify(uploadRecovered));
    stage="sample button programmatic validation recovery";
    await type("#resume","");
    await type("#jd","");
    await pressKey("#go","\uE007");
    const beforeSample=await js("return {message:document.querySelector('#err')?.textContent||'',resumeInvalid:document.querySelector('#resume')?.getAttribute('aria-invalid')||'',jobInvalid:document.querySelector('#jd')?.getAttribute('aria-invalid')||''}");
    if(!beforeSample.message.includes("Please provide both a resume and a job description")||beforeSample.resumeInvalid!=="true"||beforeSample.jobInvalid!=="true")failures.push(width+"x"+height+" could not re-enter invalid state before sample recovery: "+JSON.stringify(beforeSample));
    await pressKey("#sample","\uE007");
    const sample=await js("const e=document.querySelector('#err'),r=document.querySelector('#resume'),j=document.querySelector('#jd');return {r:r.value,j:j.value,message:e?.textContent||'',resumeInvalid:r.getAttribute('aria-invalid')||'',resumeDescribedBy:r.getAttribute('aria-describedby')||'',jobInvalid:j.getAttribute('aria-invalid')||'',jobDescribedBy:j.getAttribute('aria-describedby')||''}");
    if(sample.r.trim().split(/\s+/).length<20||sample.j.trim().split(/\s+/).length<20||sample.message||sample.resumeInvalid||sample.resumeDescribedBy.split(/\s+/).includes("err")||sample.jobInvalid||sample.jobDescribedBy.split(/\s+/).includes("err"))failures.push(width+"x"+height+" #sample: did not populate both fields and clear validation state: "+JSON.stringify(sample));
    stage="analyze button keyboard activation";
    await pressKey("#go","\uE007"); await waitFor('()=>document.querySelectorAll("#results .card").length>0');
    const result=await js("return {count:document.querySelectorAll('#results .card').length,hidden:document.querySelector('#v-results').hidden}");
    if(!result.count||result.hidden)failures.push(width+"x"+height+" #go: results did not become visible");
    const announcement=await js("const e=document.querySelector('#results-status');return {role:e?.getAttribute('role'),live:e?.getAttribute('aria-live'),text:e?.textContent||'',resultsLive:document.querySelector('#results')?.hasAttribute('aria-live')}");
    if(announcement.role!=="status"||announcement.live!=="polite"||!announcement.text.includes("Analysis complete")||!announcement.text.includes("Match score:")||announcement.resultsLive)failures.push(width+"x"+height+" result announcement contract failed: "+JSON.stringify(announcement));
    await assertNoHorizontalOverflow(width+"x"+height,"analysis results");
    stage="track application keyboard activation";
    await pressKey("#trackBtn","\uE007");
    const tracked=await js("const b=document.querySelector('#trackBtn'),t=document.querySelector('#toast');return {focused:document.activeElement===b,focusVisible:b?.matches(':focus-visible'),toast:t?.textContent||''}");
    if(!tracked.focused||!tracked.focusVisible||!tracked.toast.includes("Added to tracker"))failures.push(width+"x"+height+" #trackBtn: Enter did not add the analysis or retain visible focus: "+JSON.stringify(tracked));
    stage="tracker workflow";
    await click("#tab-tracker"); await waitFor('()=>!document.querySelector("#v-tracker").hidden');
    if(await js("return document.querySelectorAll('#board .job').length")<1)failures.push(width+"x"+height+" #trackBtn: Enter did not create a tracker entry");
    await type("#tCo","Browser Smoke Co"); await type("#tRole","Runtime QA"); await pressKey("#addJob","\uE007");
    if(await js("return document.querySelectorAll('#board .job').length")<2)failures.push(width+"x"+height+" tracker: keyboard Add did not create a second job");
    stage="tracker status change persistence across view changes";
    const trackerStatusBefore=await js("const b=document.querySelector('#board');const job=[...b.querySelectorAll('.job')].find(x=>x.querySelector('b')?.textContent==='Runtime QA');return {count:b.querySelectorAll('.job').length,status:job?.querySelector('select[data-t=mv]')?.value||'',stored:JSON.parse(localStorage.getItem('cm_track')||'[]').find(x=>x.role==='Runtime QA')?.status||''}");
    await js("const b=document.querySelector('#board');const job=[...b.querySelectorAll('.job')].find(x=>x.querySelector('b')?.textContent==='Runtime QA');const s=job?.querySelector('select[data-t=mv]');if(!s)throw new Error('Runtime QA status select missing');s.value='Interview';s.dispatchEvent(new Event('change',{bubbles:true}));");
    const trackerStatusChanged=await js("const b=document.querySelector('#board');const job=[...b.querySelectorAll('.job')].find(x=>x.querySelector('b')?.textContent==='Runtime QA');return {status:job?.querySelector('select[data-t=mv]')?.value||'',stored:JSON.parse(localStorage.getItem('cm_track')||'[]').find(x=>x.role==='Runtime QA')?.status||'',interviewColumn:[...b.querySelectorAll('.col')].find(x=>x.querySelector('h4')?.textContent.startsWith('Interview'))?.querySelectorAll('.job').length||0}");
    await click("#tab-analyze"); await waitFor('()=>!document.querySelector("#v-analyze").hidden');
    await click("#tab-tracker"); await waitFor('()=>!document.querySelector("#v-tracker").hidden');
    const trackerStatusAfter=await js("const b=document.querySelector('#board');const job=[...b.querySelectorAll('.job')].find(x=>x.querySelector('b')?.textContent==='Runtime QA');return {status:job?.querySelector('select[data-t=mv]')?.value||'',stored:JSON.parse(localStorage.getItem('cm_track')||'[]').find(x=>x.role==='Runtime QA')?.status||'',interviewColumn:[...b.querySelectorAll('.col')].find(x=>x.querySelector('h4')?.textContent.startsWith('Interview'))?.querySelectorAll('.job').length||0,appliedColumn:[...b.querySelectorAll('.col')].find(x=>x.querySelector('h4')?.textContent.startsWith('Applied'))?.querySelectorAll('.job').length||0}");
    if(trackerStatusBefore.count!==2||trackerStatusBefore.status!=="Applied"||trackerStatusBefore.stored!=="Applied"||trackerStatusChanged.status!=="Interview"||trackerStatusChanged.stored!=="Interview"||trackerStatusAfter.status!=="Interview"||trackerStatusAfter.stored!=="Interview"||trackerStatusAfter.interviewColumn!==1||trackerStatusAfter.appliedColumn!==1)failures.push(width+"x"+height+" tracker status did not persist and render in the correct column after view changes: "+JSON.stringify({trackerStatusBefore,trackerStatusChanged,trackerStatusAfter}));
    stage="tracker status storage failure restores prior selection";
    const trackerStorageFailure=await js("const b=document.querySelector('#board');const job=[...b.querySelectorAll('.job')].find(x=>x.querySelector('b')?.textContent==='Runtime QA');const s=job?.querySelector('select[data-t=mv]');const beforeStatus=s?.value||'';const beforeStored=JSON.parse(localStorage.getItem('cm_track')||'[]').find(x=>x.role==='Runtime QA')?.status||'';const originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cm_track')throw new DOMException('Storage quota exceeded','QuotaExceededError');return originalSet.call(this,k,v)};let alert='';const toast=document.querySelector('#toast');const observer=new MutationObserver(()=>{alert=toast?.textContent||''});if(toast)observer.observe(toast,{childList:true,subtree:true,characterData:true});try{s.value=beforeStatus==='Interview'?'Applied':'Interview';s.dispatchEvent(new Event('change',{bubbles:true}))}finally{Storage.prototype.setItem=originalSet;observer.disconnect()}const restored=[...b.querySelectorAll('.job')].find(x=>x.querySelector('b')?.textContent==='Runtime QA');return {beforeStatus,beforeStored,selected:restored?.querySelector('select[data-t=mv]')?.value||'',stored:JSON.parse(localStorage.getItem('cm_track')||'[]').find(x=>x.role==='Runtime QA')?.status||'',toast:document.querySelector('#toast')?.textContent||alert||''}");
    if(trackerStorageFailure.selected!==trackerStorageFailure.beforeStatus||trackerStorageFailure.stored!==trackerStorageFailure.beforeStored||trackerStorageFailure.beforeStatus!==trackerStorageFailure.beforeStored||!trackerStorageFailure.toast.includes("Browser storage unavailable"))failures.push(width+"x"+height+" failed tracker status write did not restore the previous UI and storage value: "+JSON.stringify(trackerStorageFailure));
    stage="tracker removal storage failure preserves entry and focus";
    const trackerRemoveStorageFailure=await js("const b=document.querySelector('#board');const beforeCount=b.querySelectorAll('[data-t=rm]').length;const remove=b.querySelector('[data-t=rm]');const id=remove?.dataset.id||'';const beforeStored=JSON.parse(localStorage.getItem('cm_track')||'[]');const beforeFocus=remove===document.activeElement;const originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cm_track')throw new DOMException('Storage quota exceeded','QuotaExceededError');return originalSet.call(this,k,v)};let alert='';const toast=document.querySelector('#toast');const observer=new MutationObserver(()=>{alert=toast?.textContent||''});if(toast)observer.observe(toast,{childList:true,subtree:true,characterData:true});try{remove?.focus();remove?.click()}finally{Storage.prototype.setItem=originalSet;observer.disconnect()}const after=JSON.parse(localStorage.getItem('cm_track')||'[]');const stillPresent=after.some(x=>x.id===id);return {beforeCount,beforeStored:beforeStored.length,afterCount:b.querySelectorAll('#board [data-t=rm]').length,storedAfter:after.length,id,stillPresent,focused:document.activeElement?.matches('#board [data-t=rm]')||false,focusVisible:document.activeElement?.matches(':focus-visible')||false,toast:document.querySelector('#toast')?.textContent||alert||''}");
    if(trackerRemoveStorageFailure.beforeCount!==trackerRemoveStorageFailure.afterCount||trackerRemoveStorageFailure.beforeStored!==trackerRemoveStorageFailure.storedAfter||!trackerRemoveStorageFailure.stillPresent||!trackerRemoveStorageFailure.focused||!trackerRemoveStorageFailure.focusVisible||!trackerRemoveStorageFailure.toast.includes("Browser storage unavailable"))failures.push(width+"x"+height+" failed tracker removal write changed the visible or persisted entry or lost visible focus: "+JSON.stringify(trackerRemoveStorageFailure));
    stage="tracker removal keyboard activation and focus recovery";
    const trackerBefore=await js("return document.querySelectorAll('#board [data-t=rm]').length");
    await pressKey("#board [data-t=rm]","\uE007");
    const trackerAfter=await js("return {count:document.querySelectorAll('#board [data-t=rm]').length,focus:document.activeElement?.id||'',focusVisible:document.activeElement?.matches(':focus-visible')||false,removeFocused:document.activeElement?.matches('#board [data-t=rm]')||false,toast:document.querySelector('#toast')?.textContent||''}");
    if(trackerAfter.count!==trackerBefore-1||(!trackerAfter.removeFocused&&trackerAfter.focus!=="addJob")||!trackerAfter.focusVisible||!trackerAfter.toast.includes("Application removed"))failures.push(width+"x"+height+" tracker: keyboard removal or focus recovery failed: "+JSON.stringify(trackerAfter));
    const trackerStatus=await js("return {live:document.querySelector('#board')?.getAttribute('aria-live'),atomic:document.querySelector('#board')?.getAttribute('aria-atomic'),toastRole:document.querySelector('#toast')?.getAttribute('role'),toastText:document.querySelector('#toast')?.textContent||''}");
    if(trackerStatus.live!=="polite"||trackerStatus.atomic!=="true"||trackerStatus.toastRole!=="status"||!trackerStatus.toastText.includes("Application removed"))failures.push(width+"x"+height+" tracker deletion announcement semantics failed: "+JSON.stringify(trackerStatus));
    stage="save analysis workflow";
    await click("#tab-results"); await waitFor('()=>!document.querySelector("#v-results").hidden');
    await pressKey("#results button[data-a='save']","\uE007"); await sleep(150);
    await click("#tab-saved"); await waitFor('()=>!document.querySelector("#v-saved").hidden');
    if(await js("return document.querySelectorAll('#savedList .job').length")<1)failures.push(width+"x"+height+" saved: Save Analysis did not create a saved item");
    stage="saved analysis persistence across view changes";
    const savedPersistBefore=await js("return {count:document.querySelectorAll('#savedList button[data-s=del]').length,stored:JSON.parse(localStorage.getItem('cm_saved')||'[]').length}");
    await click("#tab-analyze"); await waitFor('()=>!document.querySelector("#v-analyze").hidden');
    await click("#tab-saved"); await waitFor('()=>!document.querySelector("#v-saved").hidden');
    const savedPersistAfter=await js("return {count:document.querySelectorAll('#savedList button[data-s=del]').length,stored:JSON.parse(localStorage.getItem('cm_saved')||'[]').length,empty:!!document.querySelector('#savedList .empty')}");
    if(savedPersistBefore.count!==1||savedPersistBefore.stored!==1||savedPersistAfter.count!==1||savedPersistAfter.stored!==1||savedPersistAfter.empty)failures.push(width+"x"+height+" saved analysis did not persist across tab changes: "+JSON.stringify({savedPersistBefore,savedPersistAfter}));
    stage="saved analysis delete keyboard activation and focus recovery";
    const savedBefore=await js("return document.querySelectorAll('#savedList button[data-s=del]').length");
    await pressKey("#savedList button[data-s=del]","\uE007");
    const savedAfter=await js("return {count:document.querySelectorAll('#savedList button[data-s=del]').length,focus:document.activeElement?.id||'',focusVisible:document.activeElement?.matches(':focus-visible')||false,deleteFocused:document.activeElement?.matches('#savedList button[data-s=del]')||false,tabFocused:document.activeElement?.id==='tab-saved',tabSelected:document.querySelector('#tab-saved')?.getAttribute('aria-selected')==='true',panelVisible:!!document.querySelector('#v-saved')&&!document.querySelector('#v-saved').hidden&&document.querySelector('#v-saved').getAttribute('aria-hidden')==='false',emptyState:!document.querySelector('#savedList .job'),emptyMessage:document.querySelector('#savedList .empty')?.textContent||'',toast:document.querySelector('#toast')?.textContent||''}");
    if(savedAfter.count!==savedBefore-1||(!savedAfter.deleteFocused&&!savedAfter.tabFocused)||!savedAfter.focusVisible||!savedAfter.toast.includes("Saved analysis deleted"))failures.push(width+"x"+height+" saved: keyboard deletion or focus recovery failed: "+JSON.stringify(savedAfter));
    if(savedBefore!==1||savedAfter.count!==0||!savedAfter.emptyState||savedAfter.emptyMessage!=="No saved analyses yet."||!savedAfter.tabFocused||!savedAfter.focusVisible||!savedAfter.tabSelected||!savedAfter.panelVisible)failures.push(width+"x"+height+" saved last-item deletion did not reveal the empty state and restore visible focus to the selected Saved tab: "+JSON.stringify(savedAfter));
    const savedStatus=await js("return {live:document.querySelector('#savedList')?.getAttribute('aria-live'),atomic:document.querySelector('#savedList')?.getAttribute('aria-atomic'),toastRole:document.querySelector('#toast')?.getAttribute('role'),toastText:document.querySelector('#toast')?.textContent||''}");
    if(savedStatus.live!=="polite"||savedStatus.atomic!=="true"||savedStatus.toastRole!=="status"||!savedStatus.toastText.includes("Saved analysis deleted"))failures.push(width+"x"+height+" saved-analysis deletion announcement semantics failed: "+JSON.stringify(savedStatus));
    stage="return to analyze";
    await click("#tab-analyze"); await waitFor('()=>!document.querySelector("#v-analyze").hidden');
  } finally {
    if(sessionId){try{await command("DELETE","")}catch{}sessionId=null}
  }
}
try{await writeFile(uploadFixture,uploadText,"utf8");await startDriver();await runViewport(1440,1100);await runViewport(390,844);await runViewport(320,800)}
catch(error){failures.push("harness at "+stage+": "+error.message)}
finally{if(driver)driver.kill("SIGTERM");try{await unlink(uploadFixture)}catch{}}
if(failures.length){console.error("Career Match production browser smoke FAILED");for(const f of failures)console.error("- "+f);process.exit(1)}
console.log("Career Match production browser smoke PASSED");
