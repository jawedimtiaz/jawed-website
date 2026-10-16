import {spawn} from "node:child_process";
import {writeFile,unlink} from "node:fs/promises";

const BASE_BRANCH=(process.env.BASE_BRANCH||"").trim();
const BASE_URL=(BASE_BRANCH?`https://${BASE_BRANCH.slice(0,28).replace(/-+$/, "")}.jawed-website.pages.dev`:(process.env.BASE_URL||"https://jawed.co.in")).replace(/\/$/,"");
const CHROMEDRIVER=process.env.CHROMEDRIVER||"chromedriver";
const uploadFixture="/tmp/career-match-upload-fixture.txt";
const invalidPdfFixture="/tmp/career-match-invalid-fixture.pdf";
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
    stage="malformed persisted storage recovery";
    await js("localStorage.setItem('cm_saved','{malformed');localStorage.setItem('cm_track','{malformed');localStorage.setItem('cm_theme','{malformed')");
    await command("POST","/refresh",{});
    await sleep(500);
    await waitForElement("#file");
    await waitFor("()=>document.readyState==='complete'&&!!document.querySelector('#file')");
    const corruptStorageStartup=await js("return {file:!!document.querySelector('#file'),theme:document.documentElement.dataset.theme||'',themePressed:document.querySelector('#theme')?.getAttribute('aria-pressed')||'',savedTab:!!document.querySelector('#tab-saved'),trackerTab:!!document.querySelector('#tab-tracker'),board:!!document.querySelector('#board')}");
    if(!corruptStorageStartup.file||!corruptStorageStartup.savedTab||!corruptStorageStartup.trackerTab||!corruptStorageStartup.board||!["light","dark"].includes(corruptStorageStartup.theme)||corruptStorageStartup.themePressed!==String(corruptStorageStartup.theme==="dark"))failures.push(width+"x"+height+" malformed persisted storage prevented startup or left theme state inconsistent: "+JSON.stringify(corruptStorageStartup));
    await click("#tab-saved"); await waitFor('()=>!document.querySelector("#v-saved").hidden');
    const corruptSaved=await js("return {empty:!!document.querySelector('#savedList .empty'),count:document.querySelectorAll('#savedList .job').length}");
    if(!corruptSaved.empty||corruptSaved.count)failures.push(width+"x"+height+" malformed saved-analysis storage did not recover to the empty state: "+JSON.stringify(corruptSaved));
    await click("#tab-tracker"); await waitFor('()=>!document.querySelector("#v-tracker").hidden');
    const corruptTracker=await js("return {columns:document.querySelectorAll('#board .col').length,jobs:document.querySelectorAll('#board .job').length}");
    if(corruptTracker.columns!==4||corruptTracker.jobs)failures.push(width+"x"+height+" malformed tracker storage did not recover to four empty status columns: "+JSON.stringify(corruptTracker));
    await js("localStorage.setItem('cm_saved','[]');localStorage.setItem('cm_track','[]');localStorage.setItem('cm_theme',JSON.stringify(document.documentElement.dataset.theme||'light'))");
    await command("POST","/refresh",{});
    await sleep(500);
    await waitForElement("#file");
    await waitFor('()=>!document.querySelector("#v-analyze")?.hidden');
    stage="browser storage access denied recovery";
    await js("window.__deniedThemeBefore=document.documentElement.dataset.theme||'';window.__deniedGetItem=Storage.prototype.getItem;window.__deniedSetItem=Storage.prototype.setItem;Storage.prototype.getItem=function(){throw new DOMException('Access denied','SecurityError')};Storage.prototype.setItem=function(){throw new DOMException('Access denied','SecurityError')}");
    let deniedStartup;
    try {
      // Keep this document loaded after overriding Storage: a navigation creates a
      // fresh JavaScript realm and would silently discard the simulated denial.
      await waitFor('()=>!!document.querySelector("#theme")&&!!document.querySelector("#tab-saved")&&!!document.querySelector("#tab-tracker")');
      deniedStartup=await js("return {theme:document.documentElement.dataset.theme||'',pressed:document.querySelector('#theme')?.getAttribute('aria-pressed')||'',file:!!document.querySelector('#file'),savedTab:!!document.querySelector('#tab-saved'),trackerTab:!!document.querySelector('#tab-tracker')}");
      if(!deniedStartup.file||!deniedStartup.savedTab||!deniedStartup.trackerTab||!["light","dark"].includes(deniedStartup.theme)||deniedStartup.pressed!==String(deniedStartup.theme==="dark"))failures.push(width+"x"+height+" denied storage access prevented startup or left theme state inconsistent: "+JSON.stringify(deniedStartup));
      await pressKey("#theme","\uE007");
      const deniedThemeToggle=await js("const b=document.querySelector('#theme'),t=document.querySelector('#toast');return {before:window.__deniedThemeBefore,after:document.documentElement.dataset.theme||'',pressed:b?.getAttribute('aria-pressed')||'',focused:document.activeElement===b,focusVisible:b?.matches(':focus-visible')||false,toast:t?.textContent||'',role:t?.getAttribute('role')||'',live:t?.getAttribute('aria-live')||'',atomic:t?.getAttribute('aria-atomic')||''}");
      if(deniedThemeToggle.after===deniedThemeToggle.before||deniedThemeToggle.pressed!==String(deniedThemeToggle.after==="dark")||!deniedThemeToggle.focused||!deniedThemeToggle.focusVisible||!deniedThemeToggle.toast.includes("Browser storage unavailable")||deniedThemeToggle.role!=="status"||deniedThemeToggle.live!=="polite"||deniedThemeToggle.atomic!=="true")failures.push(width+"x"+height+" theme toggle did not remain usable and announce denied storage access: "+JSON.stringify(deniedThemeToggle));
      await click("#tab-saved"); await waitFor('()=>!document.querySelector("#v-saved").hidden');
      const deniedSaved=await js("const t=document.querySelector('#toast');return {empty:!!document.querySelector('#savedList .empty'),count:document.querySelectorAll('#savedList .job').length,toast:t?.textContent||'',role:t?.getAttribute('role')||'',live:t?.getAttribute('aria-live')||'',atomic:t?.getAttribute('aria-atomic')||''}");
      if(deniedSaved.empty||deniedSaved.count||!deniedSaved.toast.includes("Browser storage unavailable")||deniedSaved.role!=="status"||deniedSaved.live!=="polite"||deniedSaved.atomic!=="true")failures.push(width+"x"+height+" denied storage access was misrepresented as an empty saved-analysis list or omitted the accessible failure announcement: "+JSON.stringify(deniedSaved));
      await click("#tab-tracker"); await waitFor('()=>!document.querySelector("#v-tracker").hidden');
      const deniedTracker=await js("return {columns:document.querySelectorAll('#board .col').length,jobs:document.querySelectorAll('#board .job').length}");
      if(deniedTracker.columns!==4||deniedTracker.jobs)failures.push(width+"x"+height+" denied storage access did not leave tracker in a safe empty state: "+JSON.stringify(deniedTracker));
      // Attempt a real tracker write while Storage.setItem is denied. The UI
      // must explain the failure and must not show an unsaved phantom card.
      await type("#tCo","Storage-denied test company");
      await type("#tRole","Storage-denied test role");
      await click("#addJob");
      const deniedTrackerWrite=await js("return {columns:document.querySelectorAll('#board .col').length,jobs:document.querySelectorAll('#board .job').length,company:document.querySelector('#tCo')?.value||'',role:document.querySelector('#tRole')?.value||'',toast:document.querySelector('#toast')?.textContent||'',toastRole:document.querySelector('#toast')?.getAttribute('role')||'',toastLive:document.querySelector('#toast')?.getAttribute('aria-live')||'',toastAtomic:document.querySelector('#toast')?.getAttribute('aria-atomic')||''}");
      if(deniedTrackerWrite.columns!==4||deniedTrackerWrite.jobs!==0||!deniedTrackerWrite.toast.includes("Browser storage unavailable")||deniedTrackerWrite.toastRole!=="status"||deniedTrackerWrite.toastLive!=="polite"||deniedTrackerWrite.toastAtomic!=="true")failures.push(width+"x"+height+" tracker write with denied storage created a phantom job or omitted the accessible failure notice: "+JSON.stringify(deniedTrackerWrite));
    } finally {
      await js("Storage.prototype.getItem=window.__deniedGetItem;Storage.prototype.setItem=window.__deniedSetItem;delete window.__deniedGetItem;delete window.__deniedSetItem;delete window.__deniedThemeBefore");
    }
    await command("POST","/refresh",{});
    await sleep(500);
    await waitForElement("#file");
    await waitFor('()=>!document.querySelector("#v-analyze")?.hidden');
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
    const uploaded=await js("const e=document.querySelector('#err'),r=document.querySelector('#resume'),j=document.querySelector('#jd'),f=document.querySelector('#fileMsg');return {resume:r.value,job:j.value,message:e?.textContent||'',resumeInvalid:r.getAttribute('aria-invalid')||'',resumeDescribedBy:r.getAttribute('aria-describedby')||'',jobInvalid:j.getAttribute('aria-invalid')||'',jobDescribedBy:j.getAttribute('aria-describedby')||'',fileStatus:f?.textContent||'',fileRole:f?.getAttribute('role'),fileLive:f?.getAttribute('aria-live'),fileAtomic:f?.getAttribute('aria-atomic')}");
    if(uploaded.resume.trim().split(/\s+/).length<20||uploaded.message!=="Please provide at least ~20 words in the job description."||uploaded.resumeInvalid||uploaded.resumeDescribedBy.split(/\s+/).includes("err")||uploaded.jobInvalid!=="true"||!uploaded.jobDescribedBy.split(/\s+/).includes("err")||!uploaded.fileStatus.startsWith("Loaded career-match-upload-fixture.txt")||uploaded.fileRole!=="status"||uploaded.fileLive!=="polite"||uploaded.fileAtomic!=="true")failures.push(width+"x"+height+" file upload did not recover resume validation or expose atomic polite file-status announcement semantics: "+JSON.stringify(uploaded));
    await type("#jd","Job description text with enough ordinary words to satisfy the minimum validation threshold for this browser regression test and confirm upload recovery.");
    const uploadRecovered=await js("const e=document.querySelector('#err'),r=document.querySelector('#resume'),j=document.querySelector('#jd');return {message:e?.textContent||'',resumeInvalid:r?.getAttribute('aria-invalid')||'',resumeDescribedBy:r?.getAttribute('aria-describedby')||'',jobInvalid:j?.getAttribute('aria-invalid')||'',jobDescribedBy:j?.getAttribute('aria-describedby')||''}");
    if(uploadRecovered.message||uploadRecovered.resumeInvalid||uploadRecovered.resumeDescribedBy.split(/\s+/).includes("err")||uploadRecovered.jobInvalid||uploadRecovered.jobDescribedBy.split(/\s+/).includes("err"))failures.push(width+"x"+height+" upload followed by valid job description did not clear validation state: "+JSON.stringify(uploadRecovered));
    stage="invalid PDF upload status announcement and recovery";
    await upload("#file",invalidPdfFixture);
    await waitFor("()=>document.querySelector('#fileMsg')?.textContent.startsWith('Could not read file:')");
    const invalidPdf=await js("const f=document.querySelector('#file'),m=document.querySelector('#fileMsg'),r=document.querySelector('#resume');return {fileValue:f?.value||'',resume:r?.value||'',status:m?.textContent||'',role:m?.getAttribute('role'),live:m?.getAttribute('aria-live'),atomic:m?.getAttribute('aria-atomic')}");
    if(invalidPdf.fileValue||invalidPdf.resume||!invalidPdf.status.includes("The selected file does not appear to be a valid PDF.")||invalidPdf.role!=="status"||invalidPdf.live!=="polite"||invalidPdf.atomic!=="true")failures.push(width+"x"+height+" invalid PDF upload did not clear the file/resume input or expose an accessible atomic polite failure announcement: "+JSON.stringify(invalidPdf));
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
    stage="theme storage failure announces unavailable persistence";
    await js("window.__themeBefore=document.documentElement.dataset.theme;window.__themeOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cm_theme')throw new DOMException('Storage quota exceeded','QuotaExceededError');return window.__themeOriginalSetItem.call(this,k,v)}");
    let themeStorageFailure;
    try {
      await pressKey("#theme","\uE007");
      themeStorageFailure=await js("const b=document.querySelector('#theme'),t=document.querySelector('#toast');return {before:window.__themeBefore,after:document.documentElement.dataset.theme,pressed:b?.getAttribute('aria-pressed')||'',focused:document.activeElement===b,focusVisible:b?.matches(':focus-visible')||false,toast:t?.textContent||'',toastRole:t?.getAttribute('role')||'',toastLive:t?.getAttribute('aria-live')||'',toastAtomic:t?.getAttribute('aria-atomic')||''}");
    } finally {
      await js("Storage.prototype.setItem=window.__themeOriginalSetItem;delete window.__themeOriginalSetItem;delete window.__themeBefore");
    }
    if(themeStorageFailure.after===themeStorageFailure.before||themeStorageFailure.pressed!==String(themeStorageFailure.after==="dark")||!themeStorageFailure.focused||!themeStorageFailure.focusVisible||!themeStorageFailure.toast.includes("Browser storage unavailable")||themeStorageFailure.toastRole!=="status"||themeStorageFailure.toastLive!=="polite"||themeStorageFailure.toastAtomic!=="true")failures.push(width+"x"+height+" theme storage failure did not preserve an operable theme toggle and announce unavailable persistence: "+JSON.stringify(themeStorageFailure));
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
    const trackerStorageFailure=await js("const b=document.querySelector('#board');const job=[...b.querySelectorAll('.job')].find(x=>x.querySelector('b')?.textContent==='Runtime QA');const s=job?.querySelector('select[data-t=mv]');const beforeStatus=s?.value||'';const beforeStored=JSON.parse(localStorage.getItem('cm_track')||'[]').find(x=>x.role==='Runtime QA')?.status||'';const originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cm_track')throw new DOMException('Storage quota exceeded','QuotaExceededError');return originalSet.call(this,k,v)};let alert='';const toast=document.querySelector('#toast');const observer=new MutationObserver(()=>{alert=toast?.textContent||''});if(toast)observer.observe(toast,{childList:true,subtree:true,characterData:true});try{s.value=beforeStatus==='Interview'?'Applied':'Interview';s.dispatchEvent(new Event('change',{bubbles:true}))}finally{Storage.prototype.setItem=originalSet;observer.disconnect()}const restored=[...b.querySelectorAll('.job')].find(x=>x.querySelector('b')?.textContent==='Runtime QA');return {beforeStatus,beforeStored,selected:restored?.querySelector('select[data-t=mv]')?.value||'',stored:JSON.parse(localStorage.getItem('cm_track')||'[]').find(x=>x.role==='Runtime QA')?.status||'',toast:document.querySelector('#toast')?.textContent||alert||'',toastRole:document.querySelector('#toast')?.getAttribute('role')||'',toastLive:document.querySelector('#toast')?.getAttribute('aria-live')||'',toastAtomic:document.querySelector('#toast')?.getAttribute('aria-atomic')||''}");
    if(trackerStorageFailure.selected!==trackerStorageFailure.beforeStatus||trackerStorageFailure.stored!==trackerStorageFailure.beforeStored||trackerStorageFailure.beforeStatus!==trackerStorageFailure.beforeStored||!trackerStorageFailure.toast.includes("Browser storage unavailable")||trackerStorageFailure.toastRole!=="status"||trackerStorageFailure.toastLive!=="polite"||trackerStorageFailure.toastAtomic!=="true")failures.push(width+"x"+height+" failed tracker status write did not restore the previous UI/storage value or announce the failure politely: "+JSON.stringify(trackerStorageFailure));
    stage="tracker removal storage failure preserves entry and focus";
    await js("const b=document.querySelector('#board');window.__cmRemoveBeforeCount=b.querySelectorAll('[data-t=rm]').length;window.__cmRemoveButton=b.querySelector('[data-t=rm]');window.__cmRemoveId=window.__cmRemoveButton?.dataset.id||'';window.__cmRemoveBeforeStored=JSON.parse(localStorage.getItem('cm_track')||'[]');window.__cmRemoveOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cm_track')throw new DOMException('Storage quota exceeded','QuotaExceededError');return window.__cmRemoveOriginalSetItem.call(this,k,v)};window.__cmRemoveAlert='';window.__cmRemoveToast=document.querySelector('#toast');window.__cmRemoveObserver=new MutationObserver(()=>{window.__cmRemoveAlert=window.__cmRemoveToast?.textContent||''});if(window.__cmRemoveToast)window.__cmRemoveObserver.observe(window.__cmRemoveToast,{childList:true,subtree:true,characterData:true})");
    let trackerRemoveStorageFailure;
    try {
      await pressKey("#board [data-t=rm]","\uE007");
      trackerRemoveStorageFailure=await js("const b=document.querySelector('#board');const after=JSON.parse(localStorage.getItem('cm_track')||'[]');return {beforeCount:window.__cmRemoveBeforeCount,beforeStored:window.__cmRemoveBeforeStored.length,afterCount:b.querySelectorAll('#board [data-t=rm]').length,storedAfter:after.length,id:window.__cmRemoveId,stillPresent:after.some(x=>x.id===window.__cmRemoveId),focused:document.activeElement?.matches('#board [data-t=rm]')||false,focusVisible:document.activeElement?.matches(':focus-visible')||false,toast:document.querySelector('#toast')?.textContent||window.__cmRemoveAlert||'',toastRole:document.querySelector('#toast')?.getAttribute('role')||'',toastLive:document.querySelector('#toast')?.getAttribute('aria-live')||'',toastAtomic:document.querySelector('#toast')?.getAttribute('aria-atomic')||''}");
    } finally {
      await js("Storage.prototype.setItem=window.__cmRemoveOriginalSetItem;window.__cmRemoveObserver?.disconnect();delete window.__cmRemoveOriginalSetItem;delete window.__cmRemoveObserver");
    }
    if(trackerRemoveStorageFailure.beforeCount!==trackerRemoveStorageFailure.afterCount||trackerRemoveStorageFailure.beforeStored!==trackerRemoveStorageFailure.storedAfter||!trackerRemoveStorageFailure.stillPresent||!trackerRemoveStorageFailure.focused||!trackerRemoveStorageFailure.focusVisible||!trackerRemoveStorageFailure.toast.includes("Browser storage unavailable")||trackerRemoveStorageFailure.toastRole!=="status"||trackerRemoveStorageFailure.toastLive!=="polite"||trackerRemoveStorageFailure.toastAtomic!=="true")failures.push(width+"x"+height+" failed tracker removal write changed the visible or persisted entry, lost visible focus, or failed accessible error announcement semantics: "+JSON.stringify(trackerRemoveStorageFailure));
    stage="tracker removal keyboard activation and focus recovery";
    const trackerBefore=await js("return document.querySelectorAll('#board [data-t=rm]').length");
    await pressKey("#board [data-t=rm]","\uE007");
    const trackerAfter=await js("return {count:document.querySelectorAll('#board [data-t=rm]').length,focus:document.activeElement?.id||'',focusVisible:document.activeElement?.matches(':focus-visible')||false,removeFocused:document.activeElement?.matches('#board [data-t=rm]')||false,toast:document.querySelector('#toast')?.textContent||''}");
    if(trackerAfter.count!==trackerBefore-1||(!trackerAfter.removeFocused&&trackerAfter.focus!=="addJob")||!trackerAfter.focusVisible||!trackerAfter.toast.includes("Application removed"))failures.push(width+"x"+height+" tracker: keyboard removal or focus recovery failed: "+JSON.stringify(trackerAfter));
    const trackerStatus=await js("return {live:document.querySelector('#board')?.getAttribute('aria-live'),atomic:document.querySelector('#board')?.getAttribute('aria-atomic'),toastRole:document.querySelector('#toast')?.getAttribute('role'),toastText:document.querySelector('#toast')?.textContent||''}");
    if(trackerStatus.live!=="polite"||trackerStatus.atomic!=="true"||trackerStatus.toastRole!=="status"||!trackerStatus.toastText.includes("Application removed"))failures.push(width+"x"+height+" tracker deletion announcement semantics failed: "+JSON.stringify(trackerStatus));
    stage="save analysis read failure preserves existing data and announces failure";
    await click("#tab-results"); await waitFor('()=>!document.querySelector("#v-results").hidden');
    await js("window.__savedReadWriteOriginalGetItem=Storage.prototype.getItem;window.__savedReadWriteOriginalSetItem=Storage.prototype.setItem;window.__savedReadWriteSeed=[{id:'storage-read-fixture',title:'Existing saved analysis',company:'Fixture',date:'2026-10-16',score:50,html:'<section><h2>Existing</h2></section>'}];window.__savedReadWriteOriginalSetItem.call(localStorage,'cm_saved',JSON.stringify(window.__savedReadWriteSeed));Storage.prototype.getItem=function(k){if(k==='cm_saved')throw new DOMException('Storage access denied','SecurityError');return window.__savedReadWriteOriginalGetItem.call(this,k)}");
    let savedReadWriteFailure;
    try {
      await pressKey("#results button[data-a='save']","\uE007");
      savedReadWriteFailure=await js("const stored=JSON.parse(window.__savedReadWriteOriginalGetItem.call(localStorage,'cm_saved')||'[]');const b=document.querySelector('#results button[data-a=save]');const toast=document.querySelector('#toast');return {beforeCount:window.__savedReadWriteSeed.length,afterCount:stored.length,sameIds:window.__savedReadWriteSeed.map(x=>x.id).join(',')===stored.map(x=>x.id).join(','),focused:document.activeElement===b,focusVisible:b?.matches(':focus-visible')||false,toast:toast?.textContent||'',toastRole:toast?.getAttribute('role')||'',toastLive:toast?.getAttribute('aria-live')||'',toastAtomic:toast?.getAttribute('aria-atomic')||''}");
    } finally {
      await js("Storage.prototype.getItem=window.__savedReadWriteOriginalGetItem;Storage.prototype.setItem=window.__savedReadWriteOriginalSetItem;window.__savedReadWriteOriginalSetItem.call(localStorage,'cm_saved','[]');delete window.__savedReadWriteOriginalGetItem;delete window.__savedReadWriteOriginalSetItem;delete window.__savedReadWriteSeed");
    }
    if(savedReadWriteFailure.beforeCount!==1||savedReadWriteFailure.afterCount!==savedReadWriteFailure.beforeCount||!savedReadWriteFailure.sameIds||!savedReadWriteFailure.focused||!savedReadWriteFailure.focusVisible||!savedReadWriteFailure.toast.includes("Browser storage unavailable")||savedReadWriteFailure.toastRole!=="status"||savedReadWriteFailure.toastLive!=="polite"||savedReadWriteFailure.toastAtomic!=="true")failures.push(width+"x"+height+" denied saved-analysis read overwrote persisted records, lost keyboard focus, or omitted the accessible storage-failure announcement: "+JSON.stringify(savedReadWriteFailure));
    stage="save analysis storage failure preserves saved data and announces failure";
    await click("#tab-results"); await waitFor('()=>!document.querySelector("#v-results").hidden');
    await js("window.__savedSaveBefore=JSON.parse(localStorage.getItem('cm_saved')||'[]');window.__savedSaveOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cm_saved')throw new DOMException('Storage quota exceeded','QuotaExceededError');return window.__savedSaveOriginalSetItem.call(this,k,v)}");
    let savedSaveStorageFailure;
    try {
      await pressKey("#results button[data-a='save']","\uE007");
      savedSaveStorageFailure=await js("const stored=JSON.parse(localStorage.getItem('cm_saved')||'[]');const b=document.querySelector('#results button[data-a=save]');const t=document.querySelector('#toast');return {beforeCount:window.__savedSaveBefore.length,afterCount:stored.length,sameIds:window.__savedSaveBefore.map(x=>x.id).join(',')===stored.map(x=>x.id).join(','),focused:document.activeElement===b,focusVisible:b?.matches(':focus-visible')||false,toast:t?.textContent||'',toastRole:t?.getAttribute('role')||'',toastLive:t?.getAttribute('aria-live')||'',toastAtomic:t?.getAttribute('aria-atomic')||''}");
    } finally {
      await js("Storage.prototype.setItem=window.__savedSaveOriginalSetItem;delete window.__savedSaveOriginalSetItem;delete window.__savedSaveBefore");
    }
    if(savedSaveStorageFailure.beforeCount!==0||savedSaveStorageFailure.afterCount!==savedSaveStorageFailure.beforeCount||!savedSaveStorageFailure.sameIds||!savedSaveStorageFailure.focused||!savedSaveStorageFailure.focusVisible||!savedSaveStorageFailure.toast.includes("Browser storage unavailable")||savedSaveStorageFailure.toastRole!=="status"||savedSaveStorageFailure.toastLive!=="polite"||savedSaveStorageFailure.toastAtomic!=="true")failures.push(width+"x"+height+" failed save-analysis write changed persisted data, lost visible keyboard focus, or omitted the accessible storage-failure announcement: "+JSON.stringify(savedSaveStorageFailure));
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
    stage="saved analysis open status announcement";
    await pressKey("#savedList button[data-s=open]","\uE007");
    await waitFor('()=>!document.querySelector("#v-results").hidden');
    const savedOpenAnnouncement=await js("const e=document.querySelector('#results-status');return {role:e?.getAttribute('role'),live:e?.getAttribute('aria-live'),atomic:e?.getAttribute('aria-atomic'),text:e?.textContent||'',visible:!!document.querySelector('#v-results')&&!document.querySelector('#v-results').hidden,heading:document.querySelector('#results h2')?.textContent||''}");
    if(savedOpenAnnouncement.role!=="status"||savedOpenAnnouncement.live!=="polite"||savedOpenAnnouncement.atomic!=="true"||!savedOpenAnnouncement.text.startsWith("Saved analysis opened:")||!savedOpenAnnouncement.text.includes("Match score:")||!savedOpenAnnouncement.visible||!savedOpenAnnouncement.heading)failures.push(width+"x"+height+" opening a saved analysis did not expose the expected polite atomic status announcement and results panel: "+JSON.stringify(savedOpenAnnouncement));
    await click("#tab-saved"); await waitFor('()=>!document.querySelector("#v-saved").hidden');
    stage="saved-analysis open read failure preserves saved data and panel";
    await js("window.__savedOpenBefore=JSON.parse(localStorage.getItem('cm_saved')||'[]');window.__savedOpenOriginalGetItem=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='cm_saved')throw new DOMException('Storage access denied','SecurityError');return window.__savedOpenOriginalGetItem.call(this,k)}");
    let savedOpenReadFailure;
    try {
      await pressKey("#savedList button[data-s=open]","\uE007");
      savedOpenReadFailure=await js("const stored=JSON.parse(window.__savedOpenOriginalGetItem.call(localStorage,'cm_saved')||'[]');const b=document.querySelector('#savedList button[data-s=open]');const t=document.querySelector('#toast');return {beforeCount:window.__savedOpenBefore.length,afterCount:document.querySelectorAll('#savedList button[data-s=open]').length,storedCount:stored.length,sameIds:window.__savedOpenBefore.map(x=>x.id).join(',')===stored.map(x=>x.id).join(','),focused:document.activeElement===b,focusVisible:b?.matches(':focus-visible')||false,panelVisible:!document.querySelector('#v-saved').hidden,toast:t?.textContent||'',toastRole:t?.getAttribute('role')||'',toastLive:t?.getAttribute('aria-live')||'',toastAtomic:t?.getAttribute('aria-atomic')||''}");
    } finally {
      await js("Storage.prototype.getItem=window.__savedOpenOriginalGetItem;delete window.__savedOpenOriginalGetItem;delete window.__savedOpenBefore");
    }
    if(savedOpenReadFailure.beforeCount!==1||savedOpenReadFailure.afterCount!==savedOpenReadFailure.beforeCount||savedOpenReadFailure.storedCount!==savedOpenReadFailure.beforeCount||!savedOpenReadFailure.sameIds||!savedOpenReadFailure.focused||!savedOpenReadFailure.focusVisible||!savedOpenReadFailure.panelVisible||!savedOpenReadFailure.toast.includes("Browser storage unavailable")||savedOpenReadFailure.toastRole!=="status"||savedOpenReadFailure.toastLive!=="polite"||savedOpenReadFailure.toastAtomic!=="true")failures.push(width+"x"+height+" denied saved-analysis open changed saved records or panel, lost keyboard focus, or omitted the accessible storage-failure announcement: "+JSON.stringify(savedOpenReadFailure));
    stage="tracker read failure preserves rendered entries";
    await click("#tab-analyze"); await waitFor('()=>!document.querySelector("#v-analyze").hidden');
    await click("#tab-tracker"); await waitFor('()=>!document.querySelector("#v-tracker").hidden');
    await type("#tCo","Tracker read preservation test"); await type("#tRole","Persisted tracker role"); await click("#addJob");
    const trackerBeforeReadFailure=await js("return {jobs:document.querySelectorAll('#board .job').length,role:[...document.querySelectorAll('#board .job b')].some(b=>b.textContent==='Persisted tracker role')}");
    await click("#tab-analyze"); await waitFor('()=>!document.querySelector("#v-analyze").hidden');
    await js("window.__trackerReadOriginalGetItem=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='cm_track')throw new DOMException('Storage access denied','SecurityError');return window.__trackerReadOriginalGetItem.call(this,k)}");
    let trackerReadFailure;
    try {
      await click("#tab-tracker"); await waitFor('()=>!document.querySelector("#v-tracker").hidden');
      trackerReadFailure=await js("const t=document.querySelector('#toast');return {jobs:document.querySelectorAll('#board .job').length,role:[...document.querySelectorAll('#board .job b')].some(b=>b.textContent==='Persisted tracker role'),columns:document.querySelectorAll('#board .col').length,toast:t?.textContent||'',roleAttr:t?.getAttribute('role')||'',live:t?.getAttribute('aria-live')||'',atomic:t?.getAttribute('aria-atomic')||''}");
    } finally {
      await js("Storage.prototype.getItem=window.__trackerReadOriginalGetItem;delete window.__trackerReadOriginalGetItem");
    }
    if(trackerBeforeReadFailure.jobs!==1||!trackerBeforeReadFailure.role||trackerReadFailure.jobs!==1||!trackerReadFailure.role||trackerReadFailure.columns!==4||!trackerReadFailure.toast.includes("Browser storage unavailable")||trackerReadFailure.roleAttr!=="status"||trackerReadFailure.live!=="polite"||trackerReadFailure.atomic!=="true")failures.push(width+"x"+height+" denied tracker read discarded rendered entries or omitted the accessible storage-failure notice: "+JSON.stringify({trackerBeforeReadFailure,trackerReadFailure}));
    await js("localStorage.setItem('cm_track','[]')");
    await command("POST","/refresh",{});
    await sleep(500);
    await waitForElement("#file");
    await waitFor('()=>!document.querySelector("#v-analyze")?.hidden');
    stage="saved panel read failure does not imply an empty list";
    await click("#tab-analyze"); await waitFor('()=>!document.querySelector("#v-analyze").hidden');
    await js("window.__savedPanelOriginalGetItem=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='cm_saved')throw new DOMException('Storage access denied','SecurityError');return window.__savedPanelOriginalGetItem.call(this,k)}");
    let savedPanelReadFailure;
    try {
      await click("#tab-saved"); await waitFor('()=>!document.querySelector("#v-saved").hidden');
      savedPanelReadFailure=await js("const root=document.querySelector('#savedList');const t=document.querySelector('#toast');return {panelVisible:!document.querySelector('#v-saved').hidden,items:root.querySelectorAll('button[data-s=open]').length,emptyMessage:root.querySelector('.empty')?.textContent||'',toast:t?.textContent||'',toastRole:t?.getAttribute('role')||'',toastLive:t?.getAttribute('aria-live')||'',toastAtomic:t?.getAttribute('aria-atomic')||''}");
    } finally {
      await js("Storage.prototype.getItem=window.__savedPanelOriginalGetItem;delete window.__savedPanelOriginalGetItem");
    }
    if(!savedPanelReadFailure.panelVisible||savedPanelReadFailure.items!==1||savedPanelReadFailure.emptyMessage||!savedPanelReadFailure.toast.includes("Browser storage unavailable")||savedPanelReadFailure.toastRole!=="status"||savedPanelReadFailure.toastLive!=="polite"||savedPanelReadFailure.toastAtomic!=="true")failures.push(width+"x"+height+" denied saved-panel read was misrepresented as an empty saved-analysis list or omitted the accessible storage-failure announcement: "+JSON.stringify(savedPanelReadFailure));
    stage="saved analysis read failure preserves item and focus";
    await js("window.__savedReadBefore=JSON.parse(localStorage.getItem('cm_saved')||'[]');window.__savedReadOriginalGetItem=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='cm_saved')throw new DOMException('Storage access denied','SecurityError');return window.__savedReadOriginalGetItem.call(this,k)}");
    let savedReadStorageFailure;
    try {
      await pressKey("#savedList button[data-s=del]","\uE007");
      savedReadStorageFailure=await js("const stored=JSON.parse(window.__savedReadOriginalGetItem.call(localStorage,'cm_saved')||'[]');const b=document.querySelector('#savedList button[data-s=del]');const t=document.querySelector('#toast');return {beforeCount:window.__savedReadBefore.length,afterCount:document.querySelectorAll('#savedList button[data-s=del]').length,storedBefore:window.__savedReadBefore.length,storedAfter:stored.length,sameIds:window.__savedReadBefore.map(x=>x.id).join(',')===stored.map(x=>x.id).join(','),focused:document.activeElement===b,focusVisible:b?.matches(':focus-visible')||false,toast:t?.textContent||'',toastRole:t?.getAttribute('role')||'',toastLive:t?.getAttribute('aria-live')||'',toastAtomic:t?.getAttribute('aria-atomic')||''}");
    } finally {
      await js("Storage.prototype.getItem=window.__savedReadOriginalGetItem;delete window.__savedReadOriginalGetItem;delete window.__savedReadBefore");
    }
    if(savedReadStorageFailure.beforeCount!==1||savedReadStorageFailure.afterCount!==savedReadStorageFailure.beforeCount||savedReadStorageFailure.storedAfter!==savedReadStorageFailure.storedBefore||!savedReadStorageFailure.sameIds||!savedReadStorageFailure.focused||!savedReadStorageFailure.focusVisible||!savedReadStorageFailure.toast.includes("Browser storage unavailable")||savedReadStorageFailure.toastRole!=="status"||savedReadStorageFailure.toastLive!=="polite"||savedReadStorageFailure.toastAtomic!=="true")failures.push(width+"x"+height+" denied saved-analysis read changed the visible/persisted item, lost keyboard focus, or omitted the accessible storage-failure announcement: "+JSON.stringify(savedReadStorageFailure));
    stage="saved analysis deletion storage failure preserves item and focus";
    await js("window.__savedRemoveBefore=JSON.parse(localStorage.getItem('cm_saved')||'[]');window.__savedRemoveButton=document.querySelector('#savedList button[data-s=del]');window.__savedRemoveOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cm_saved')throw new DOMException('Storage quota exceeded','QuotaExceededError');return window.__savedRemoveOriginalSetItem.call(this,k,v)}");
    let savedRemoveStorageFailure;
    try {
      await pressKey("#savedList button[data-s=del]","\uE007");
      savedRemoveStorageFailure=await js("const stored=JSON.parse(localStorage.getItem('cm_saved')||'[]');return {beforeCount:window.__savedRemoveBefore.length,afterCount:document.querySelectorAll('#savedList button[data-s=del]').length,storedBefore:window.__savedRemoveBefore.length,storedAfter:stored.length,sameIds:window.__savedRemoveBefore.map(x=>x.id).join(',')===stored.map(x=>x.id).join(','),focused:document.activeElement?.matches('#savedList button[data-s=del]')||false,focusVisible:document.activeElement?.matches(':focus-visible')||false,toast:document.querySelector('#toast')?.textContent||'',toastRole:document.querySelector('#toast')?.getAttribute('role')||'',toastLive:document.querySelector('#toast')?.getAttribute('aria-live')||'',toastAtomic:document.querySelector('#toast')?.getAttribute('aria-atomic')||''}");
    } finally {
      await js("Storage.prototype.setItem=window.__savedRemoveOriginalSetItem;delete window.__savedRemoveOriginalSetItem;delete window.__savedRemoveBefore;delete window.__savedRemoveButton");
    }
    if(savedRemoveStorageFailure.beforeCount!==1||savedRemoveStorageFailure.afterCount!==savedRemoveStorageFailure.beforeCount||savedRemoveStorageFailure.storedAfter!==savedRemoveStorageFailure.storedBefore||!savedRemoveStorageFailure.sameIds||!savedRemoveStorageFailure.focused||!savedRemoveStorageFailure.focusVisible||!savedRemoveStorageFailure.toast.includes("Browser storage unavailable")||savedRemoveStorageFailure.toastRole!=="status"||savedRemoveStorageFailure.toastLive!=="polite"||savedRemoveStorageFailure.toastAtomic!=="true")failures.push(width+"x"+height+" failed saved-analysis deletion changed the visible/persisted item, lost keyboard focus, or omitted the accessible storage-failure announcement: "+JSON.stringify(savedRemoveStorageFailure));
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
try{await writeFile(uploadFixture,uploadText,"utf8");await writeFile(invalidPdfFixture,"This is deliberately not a PDF document.","utf8");await startDriver();await runViewport(1440,1100);await runViewport(390,844);await runViewport(320,800)}
catch(error){failures.push("harness at "+stage+": "+error.message)}
finally{if(driver)driver.kill("SIGTERM");try{await unlink(uploadFixture)}catch{}try{await unlink(invalidPdfFixture)}catch{}}
if(failures.length){console.error("Career Match production browser smoke FAILED");for(const f of failures)console.error("- "+f);process.exit(1)}
console.log("Career Match production browser smoke PASSED");
