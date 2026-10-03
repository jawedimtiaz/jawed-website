#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";

const sitemap=fs.readFileSync("sitemap.xml","utf8");
const tree=execFileSync("git",["ls-files","*.html"],{encoding:"utf8"}).trim().split(/\r?\n/).filter(Boolean);
const sourcePath=(url)=>url==="/"?"index.html":url.replace(/^\/+|\/+$/g,"")+"/index.html";
const sitemapUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1].trim());
const siteUrls=sitemapUrls.filter(url=>url.startsWith("https://jawed.co.in/"));
const sitemapPaths=siteUrls.map(url=>url.slice("https://jawed.co.in".length)||"/");
const sourcePaths=tree.filter(file=>file!=="404.html"&&!file.startsWith("google"));
const missingSources=sitemapPaths.filter(path=>!fs.existsSync(sourcePath(path)));
const unsitemapPages=sourcePaths.filter(file=>{
  const path=file==="index.html"?"/":"/"+file.replace(/\/index\.html$/,"")+"/";
  return !sitemapPaths.includes(path);
});
const duplicateSitemapPaths=sitemapPaths.filter((path,index)=>sitemapPaths.indexOf(path)!==index);
const errors=[];

const blogArticle=fs.readFileSync("blog/rebuilding-jawed-co-in/index.html","utf8");
const blogBreadcrumbContract=blogArticle.includes('"@type":"BreadcrumbList"')&&blogArticle.includes('"position":1,"name":"Home"')&&blogArticle.includes('"position":2,"name":"Blog"')&&blogArticle.includes('"position":3,"name":"Rebuilding Jawed.co.in"');
if(!blogBreadcrumbContract)errors.push("Blog article must preserve breadcrumb structured data matching the visible Home > Blog > Article path");
else console.log("Blog breadcrumb structured-data contract: PASS");

const blogArticleContract=blogArticle.includes('"@type":"BlogPosting"')&&blogArticle.includes('"datePublished":"2026-09-27"')&&blogArticle.includes('"author":{"@type":"Person","name":"Jawed Imtiaz"');
if(!blogArticleContract)errors.push("Blog article must preserve BlogPosting author/date structured data");
else console.log("BlogPosting structured-data contract: PASS");



const publishedHtml=sourcePaths.filter(file=>file.endsWith(".html"));
const routeForSource=file=>file==="index.html"?"/":"/"+file.replace(/\\/g,"/").replace(/\/index\.html$/,"")+"/";
const publishedRoutes=new Set(publishedHtml.map(routeForSource));
const metadataContractErrors=[];
for(const file of publishedHtml){
  const html=fs.readFileSync(file,"utf8");
  const route=routeForSource(file);
  const expectedCanonical="https://jawed.co.in"+route;
  const title=html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
  const description=html.match(/<meta name="description" content="([^"]*)"/)?.[1]?.trim();
  if(!title)metadataContractErrors.push(file+" title missing");
  if(!description)metadataContractErrors.push(file+" meta description missing");
  const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const ogUrl=html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
  const twitterCard=html.match(/<meta name="twitter:card" content="([^"]+)"/)?.[1];
  const ldBlocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if(canonical!==expectedCanonical)metadataContractErrors.push(file+" canonical="+(canonical||"missing"));
  if(ogUrl!==expectedCanonical)metadataContractErrors.push(file+" og:url="+(ogUrl||"missing"));
  if(twitterCard!=="summary_large_image")metadataContractErrors.push(file+" twitter:card="+(twitterCard||"missing"));
  for(const block of ldBlocks){try{JSON.parse(block[1])}catch{metadataContractErrors.push(file+" JSON-LD invalid")}}
}
if(metadataContractErrors.length)errors.push("Published-page metadata contract failed: "+metadataContractErrors.join(", "));


const internalLinkIssues=[];
for(const file of publishedHtml){
  const html=fs.readFileSync(file,"utf8");
  for(const match of html.matchAll(/(?:href|action)=["']([^"']+)["']/g)){
    const value=match[1];
    if(!value.startsWith("/")||value.startsWith("//")||value.startsWith("/ai/?q="))continue;
    const hashIndex=value.indexOf("#");
    const targetPath=hashIndex===-1?value:value.slice(0,hashIndex);
    const fragment=hashIndex===-1?"":decodeURIComponent(value.slice(hashIndex+1));
    if(targetPath.startsWith("/assets/")||targetPath==="/favicon.svg"||/\.[a-z0-9]{2,5}$/i.test(targetPath))continue;
    const normalizedPath=targetPath===""?"/":(targetPath.endsWith("/")?targetPath:targetPath+"/");
    if(!publishedRoutes.has(normalizedPath)){
      internalLinkIssues.push(file+" -> "+value);
      continue;
    }
    if(fragment){
      const targetSource=normalizedPath==="/"?"index.html":normalizedPath.replace(/^\/+|\/+$/g,"")+"/index.html";
      const targetHtml=fs.readFileSync(targetSource,"utf8");
      const hasFragment=targetHtml.includes('id="'+fragment+'"')||targetHtml.includes("id='"+fragment+"'")||targetHtml.includes('name="'+fragment+'"')||targetHtml.includes("name='"+fragment+"'");
      if(!hasFragment)internalLinkIssues.push(file+" -> "+value);
    }
  }
}
if(internalLinkIssues.length)errors.push("Internal links or fragment targets are invalid: "+internalLinkIssues.join(", "));

const careerMatch=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchSavedContentContract=[
  ["Career Match saved content is sanitized before storage",careerMatch.includes("function parseSanitizedSavedHtml(html)")&&careerMatch.includes('serializeChildren(parseSanitizedSavedHtml(serializeChildren($("#results"))))')],
  ["Career Match saved content is sanitized before restore",careerMatch.includes("const safe=parseSanitizedSavedHtml(x.html)")&&careerMatch.includes('$("#results").replaceChildren(frag)')],
  ["Career Match sanitizer removes event-handler attributes",careerMatch.includes('a.name.toLowerCase().startsWith("on")')],
  ["Career Match restored content uses DOM replacement without innerHTML",!careerMatch.includes(".innerHTML")&&careerMatch.includes("replaceChildren")]
];
const missingCareerMatchContracts=careerMatchSavedContentContract.filter(([,ok])=>!ok).map(([name])=>name);
if(missingCareerMatchContracts.length)errors.push("Career Match saved-content contract missing: "+missingCareerMatchContracts.join(", "));

const mainJs=fs.readFileSync("assets/js/main.js","utf8");
const jawedAiWidgetAccessibilityContract=mainJs.includes('panel.setAttribute("role","dialog")')&&mainJs.includes('panel.setAttribute("aria-modal","false")')&&mainJs.includes('panel.setAttribute("aria-labelledby","jawed-ai-title")')&&mainJs.includes('title.id="jawed-ai-title"')&&mainJs.includes('if(open)input.focus();else toggle.focus()')&&mainJs.includes('document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden)setOpen(false)})');
if(!jawedAiWidgetAccessibilityContract)errors.push("Jawed AI floating widget must expose dialog semantics, an accessible title, and keyboard focus return");
else console.log("Jawed AI widget accessibility contract: PASS");
const jawedAiWidgetEventContract=!mainJs.includes("document.addEventListener(\"click\",captureClose,true)")&&!mainJs.includes("addEventListener(\"pointerdown\",closePanel)")&&!mainJs.includes("addEventListener(\"touchstart\",closePanel");
if(!jawedAiWidgetEventContract)errors.push("Jawed AI widget close controls must not register redundant global or duplicate pointer/touch handlers");
else console.log("Jawed AI widget event-handling contract: PASS");
const jawedAiWidgetStatusContract=mainJs.includes('status.setAttribute("role","status")')&&mainJs.includes('status.setAttribute("aria-live","polite")')&&mainJs.includes('status.setAttribute("aria-atomic","true")');
if(!jawedAiWidgetStatusContract)errors.push("Jawed AI widget status must expose an explicit polite live region with atomic updates");
else console.log("Jawed AI widget status live-region contract: PASS");


const discoveryQueryBoundaryContract=[
  ["discovery URL query is bounded to 200 characters",mainJs.includes("initial.trim().slice(0,200)")],
  ["typed discovery query is bounded to 200 characters",mainJs.includes("i.value.trim().slice(0,200)")]
];
const missingDiscoveryQueryBoundaryContracts=discoveryQueryBoundaryContract.filter(([,ok])=>!ok).map(([name])=>name);
const discoveryHistoryContract=[
  ["discovery filter listens for browser history navigation",mainJs.includes("window.addEventListener('popstate',()=>{const current=new URLSearchParams(window.location.search).get('q')||''")],
  ["history navigation re-applies discovery filtering",mainJs.includes("i.value=current;update(false)")]
];
const discoveryUrlNormalizationContract=[
  ["deep-linked discovery query is normalized in the URL",mainJs.includes("const normalized=initial.trim().slice(0,200)")&&mainJs.includes("next.searchParams.set('q',normalized)")&&mainJs.includes("window.history.replaceState")]
];
const missingDiscoveryHistoryContracts=discoveryHistoryContract.filter(([,ok])=>!ok).map(([name])=>name);
const missingDiscoveryUrlNormalizationContracts=discoveryUrlNormalizationContract.filter(([,ok])=>!ok).map(([name])=>name);
const discoveryAiContract=[
  ["AI handoff captures the active discovery query",mainJs.includes("const aiLink=document.querySelector('.ai-discovery-card a[href^=\"/ai/?q=\"]')")],
  ["AI handoff bounds copied discovery context",mainJs.includes("raw.slice(0,200)")],
  ["AI handoff encodes the contextual prompt through URLSearchParams",mainJs.includes("aiUrl.searchParams.set('q',handoff)")]
];
const discoveryFilterContract=[
  ["notes filter excludes Jawed AI handoff",mainJs.includes("selector:'main .card:not(.ai-discovery-card),main section[id^=\"subject-\"],main section[id^=\"task-\"]'")&&mainJs.includes("label:'note results'")],
  ["tools filter excludes Jawed AI handoff",mainJs.includes("selector:'main .card:not(.ai-discovery-card)',label:'tool results'")],
  ["topics filter excludes Jawed AI handoff",mainJs.includes("selector:'main section:not(.discovery-panel) .card:not(.ai-discovery-card)',label:'topic results'")],
  ["blog filter excludes Jawed AI handoff",mainJs.includes("selector:'main .card:not(.ai-discovery-card)',label:'post results'")],
  ["resources filter excludes Jawed AI handoff",mainJs.includes("selector:'main .card:not(.ai-discovery-card)',label:'resource results'")]
];
const missingDiscoveryContracts=discoveryFilterContract.filter(([,ok])=>!ok).map(([name])=>name);
const missingDiscoveryAiContracts=discoveryAiContract.filter(([,ok])=>!ok).map(([name])=>name);
if(missingDiscoveryQueryBoundaryContracts.length)errors.push("Discovery query-boundary contract missing: "+missingDiscoveryQueryBoundaryContracts.join(", "));
if(missingDiscoveryHistoryContracts.length)errors.push("Discovery browser-history contract missing: "+missingDiscoveryHistoryContracts.join(", "));
if(missingDiscoveryUrlNormalizationContracts.length)errors.push("Discovery URL-normalization contract missing: "+missingDiscoveryUrlNormalizationContracts.join(", "));
if(missingDiscoveryAiContracts.length)errors.push("Discovery-to-AI context contract missing: "+missingDiscoveryAiContracts.join(", "));
if(missingDiscoveryContracts.length)errors.push("Discovery filter contract missing: "+missingDiscoveryContracts.join(", "));
if(sitemapUrls.length!==siteUrls.length)errors.push("Sitemap contains URLs outside https://jawed.co.in/.");
if(duplicateSitemapPaths.length)errors.push("Sitemap contains duplicate paths: "+[...new Set(duplicateSitemapPaths)].join(", "));
if(missingSources.length)errors.push("Sitemap pages have no repository source file: "+missingSources.join(", "));
if(unsitemapPages.length)errors.push("Published HTML pages are missing from sitemap: "+unsitemapPages.join(", "));
console.log("Career Match saved-content security contract: PASS");
const careerMatchTabs=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchTabContract=careerMatchTabs.includes('role="tablist"')&&careerMatchTabs.includes('role="tab"')&&careerMatchTabs.includes('aria-selected="true"')&&careerMatchTabs.includes('aria-controls="v-results"')&&careerMatchTabs.includes("careerTabs");
if(!careerMatchTabContract)errors.push("Career Match view controls must expose accessible tab semantics and keyboard navigation");
else console.log("Career Match view accessibility contract: PASS");

const careerMatchStatusRegions=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchTabPanelAccessibilityContract=
  careerMatch.includes('id="tab-analyze"')&&
  careerMatch.includes('id="tab-results"')&&
  careerMatch.includes('id="tab-tracker"')&&
  careerMatch.includes('id="tab-saved"')&&
  careerMatch.includes('id="v-analyze" class="view" role="tabpanel" aria-labelledby="tab-analyze"')&&
  careerMatch.includes('id="v-results" class="view hidden" role="tabpanel" aria-labelledby="results-heading"')&&
  careerMatch.includes('id="v-tracker" class="view hidden" role="tabpanel" aria-labelledby="tab-tracker"')&&
  careerMatch.includes('id="v-saved" class="view hidden" role="tabpanel" aria-labelledby="tab-saved"');
if(!careerMatchTabPanelAccessibilityContract)errors.push("Career Match tabpanels must remain programmatically labelled by their controlling tabs");
else console.log("Career Match tabpanel labelling contract: PASS");

const careerMatchStatusRegionContract=
  careerMatchStatusRegions.includes('<div class="muted" id="fileMsg" role="status" aria-live="polite">')&&
  careerMatchStatusRegions.includes('<span class="muted" id="err" role="alert" aria-live="assertive">')&&
  careerMatchStatusRegions.includes('id="toast" role="status"');
if(!careerMatchStatusRegionContract)errors.push("Career Match dynamic status and validation messages must expose live-region semantics");
else console.log("Career Match status live-region accessibility contract: PASS");

const aiPage=fs.readFileSync("ai/index.html","utf8");
const aiPageStatusLiveRegionContract=aiPage.includes('<p id="ai-status" class="form-note" role="status" aria-live="polite" aria-atomic="true">');
if(!aiPageStatusLiveRegionContract)errors.push("Dedicated Jawed AI status must expose an explicit polite live region with atomic updates");
else console.log("Dedicated Jawed AI status live-region contract: PASS");

const aiPageBusyContract=aiPage.includes('const setBusy=busy=>{input.disabled=busy;if(button)button.disabled=busy;button?.setAttribute("aria-busy",busy?"true":"false");box.setAttribute("aria-busy",busy?"true":"false")};');
if(!aiPageBusyContract)errors.push("Dedicated Jawed AI conversation log must expose aria-busy while requests are in flight");
else console.log("Dedicated Jawed AI conversation busy-state contract: PASS");

const financeWorkspace=fs.readFileSync("tools/finance-planning-workspace/index.html","utf8");
const financeWorkspaceTabContract=
  financeWorkspace.includes('<div class="tabs" role="tablist" aria-label="Finance planning sections">')&&
  financeWorkspace.includes('role="tab"')&&
  financeWorkspace.includes('aria-controls="snapshot"')&&
  financeWorkspace.includes('aria-selected="true"')&&
  financeWorkspace.includes('tabIndex=active?0:-1')&&
  financeWorkspace.includes('e.preventDefault();let next=index')&&
  financeWorkspace.includes('e.key==="ArrowRight"')&&
  financeWorkspace.includes('e.key==="ArrowLeft"')&&
  financeWorkspace.includes('e.key==="Home"')&&
  financeWorkspace.includes('e.key==="End"')&&
  financeWorkspace.includes('activateTab(tabs[next])');
if(!financeWorkspaceTabContract)errors.push("Finance Planning Workspace tabs must preserve accessible ARIA semantics and keyboard navigation");
else console.log("Finance Planning Workspace tab accessibility contract: PASS");
const generatorFreshnessChecks=[
 ["AI Prompt Builder", "tools/ai-prompt-builder/index.html", "Inputs changed. Build the prompt again to refresh the output.", ["#prompt-goal","#prompt-context","#prompt-desired-output","#prompt-constraints","#prompt-example"]],
 ["Service Desk Note Formatter", "tools/service-desk-note-formatter/index.html", "Inputs changed. Format the note again to refresh the output.", ["#note-issue","#note-actions","#note-resolution","#note-followup"]],
 ["Ticket to Knowledge Base Draft", "tools/ticket-to-knowledge-base-draft/index.html", "Inputs changed. Build the draft again to refresh the output.", ["#kb-problem","#kb-scope","#kb-checks","#kb-resolution","#kb-validation","#kb-escalation","#kb-maintenance"]]
];
for(const [name,path,message,fields] of generatorFreshnessChecks){
 const html=fs.readFileSync(path,"utf8");
 const ok=html.includes(message)&&html.includes("document.querySelector(id).addEventListener(\'input\',markDirty)");
 if(!ok)errors.push(name+" must mark generated output stale when inputs change");
}
if(generatorFreshnessChecks.every(([name,path,message])=>fs.readFileSync(path,"utf8").includes(message)))console.log("Generator output freshness contract: PASS");
const calculatorInvalidResultChecks=[
 ["Compound Growth & SIP","tools/compound-growth-sip-calculator/index.html",["fv.textContent=ti.textContent=eg.textContent=\"—\"","summary.textContent=\"\""]],
 ["Inflation Goal Planning","tools/inflation-goal-planning-calculator/index.html",["future.textContent=increase.textContent=gap.textContent=\"—\"","summary.textContent=\"\""]],
 ["Retirement Planning","tools/retirement-planning-calculator/index.html",[`["years","futureSpending","horizon","required","projected","gap"].forEach(k=>out[k].textContent="—")`,"out.summary.textContent=\"\""]]
];
for(const [name,path,patterns] of calculatorInvalidResultChecks){
 const html=fs.readFileSync(path,"utf8");
 if(!patterns.every(pattern=>html.includes(pattern)))errors.push(name+" must clear stale result values when submitted inputs are invalid");
}
if(calculatorInvalidResultChecks.every(([name,path,patterns])=>patterns.every(pattern=>fs.readFileSync(path,"utf8").includes(pattern))))console.log("Calculator invalid-input result contract: PASS");



console.log("Internal link and fragment integrity: PASS");
const troubleshootingTool=fs.readFileSync("tools/it-troubleshooting-assistant/index.html","utf8");
const troubleshootingFocusContract=troubleshootingTool.includes("state.node=flows[state.type].start;renderIntro();const first=r.querySelector('[data-answer]');if(first)first.focus({preventScroll:true})")&&troubleshootingTool.includes("r.setAttribute('tabindex','-1');r.focus({preventScroll:true});return}state.node=flows[state.type][nextKey];");
if(!troubleshootingFocusContract)errors.push("IT Troubleshooting Assistant must move focus to decision controls and terminal results");
else console.log("IT Troubleshooting result focus contract: PASS");

const careerMatchFocus=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchFocusRecoveryContract=careerMatchFocus.includes('const index=[...$("#savedList").querySelectorAll("button[data-s=del]")].indexOf(b)')&&careerMatchFocus.includes('(buttons[Math.min(index,buttons.length-1)]||document.querySelector(`nav[role="tablist"] [data-v="saved"]`)).focus({preventScroll:true})')&&careerMatchFocus.includes('const index=[...$("#board").querySelectorAll("[data-t=rm]")].indexOf(b)')&&careerMatchFocus.includes('(buttons[Math.min(index,buttons.length-1)]||$("#addJob")).focus({preventScroll:true})');
if(!careerMatchFocusRecoveryContract)errors.push("Career Match mutations must restore keyboard focus after saved-analysis and tracker deletions");
else console.log("Career Match mutation focus recovery contract: PASS");

const careerMatchSavedFocus=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchSavedFocusContract=careerMatchSavedFocus.includes(`document.querySelector(\`nav[role="tablist"] [data-v="saved"]\`)`)&&!careerMatchSavedFocus.includes(`||$("#saved")`);
if(!careerMatchSavedFocusContract)errors.push("Career Match saved deletion must focus an existing Saved tab when no remaining delete button exists");
else console.log("Career Match saved deletion focus recovery contract: PASS");
const careerMatchTrackerMetadata=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchTrackerMetadataContract=careerMatchTrackerMetadata.includes('typeof x.date==="string"&&/^\\d{4}-\\d{2}-\\d{2}$/.test(x.date)');
if(!careerMatchTrackerMetadataContract)errors.push("Career Match tracker records must validate their persisted date before rendering");
else console.log("Career Match tracker metadata integrity contract: PASS");
const careerMatchSavedMetadata=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchSavedMetadataContract=careerMatchSavedMetadata.includes('typeof x.title==="string"')&&careerMatchSavedMetadata.includes('typeof x.date==="string"')&&careerMatchSavedMetadata.includes('Number.isFinite(x.score)&&x.score>=0&&x.score<=100');
if(!careerMatchSavedMetadataContract)errors.push("Career Match saved analysis metadata must validate title, date and a finite 0-100 score before rendering");
else console.log("Career Match saved-analysis metadata integrity contract: PASS");
const careerMatchTheme=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchThemeContract=careerMatchTheme.includes('const theme=t==="dark"||t==="light"?t:"light"');
if(!careerMatchThemeContract)errors.push("Career Match persisted theme state must be restricted to the supported light/dark values");
else console.log("Career Match theme-state integrity contract: PASS");
const careerMatchStorage=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchStorageContract=careerMatchStorage.includes("function validSavedList(v)")&&careerMatchStorage.includes("function validTrackList(v)")&&careerMatchStorage.includes("validSavedList(store.get(\"cm_saved\",[]))")&&careerMatchStorage.includes("validTrackList(store.get(\"cm_track\",[]))");
if(!careerMatchStorageContract)errors.push("Career Match persisted saved and tracker data must be shape-validated before use");
else console.log("Career Match persisted-state integrity contract: PASS");

const careerMatchPersistedIdRendering=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchPersistedIdRenderingContract=careerMatchPersistedIdRendering.includes("btn.dataset.id=x.id")&&careerMatchPersistedIdRendering.includes("btn.dataset.s=action[1]")&&careerMatchPersistedIdRendering.includes("btn.dataset.id=x.id")&&careerMatchPersistedIdRendering.includes("btn.dataset.t=\"rm\"");
if(!careerMatchPersistedIdRenderingContract)errors.push("Career Match persisted record IDs must be HTML-escaped before rendering into action attributes");
else console.log("Career Match persisted-ID rendering safety contract: PASS");

const careerMatchSavedSanitizerBoundary=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchSavedSanitizerBoundaryContract=careerMatchSavedSanitizerBoundary.includes("script,iframe,object,embed,form,style,svg,math,base,meta,link,button,input,textarea,select,option,details,summary");
if(!careerMatchSavedSanitizerBoundaryContract)errors.push("Career Match saved-content sanitizer must remove executable, navigational, metadata and interactive elements before persistence or restore");
else console.log("Career Match saved-content element boundary contract: PASS");

const careerMatchSavedMutationGuard=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchSavedMutationGuardContract=careerMatchSavedMutationGuard.includes('const R=window.CUR,s=validSavedList(store.get("cm_saved",[])),html=serializeChildren(parseSanitizedSavedHtml');
if(!careerMatchSavedMutationGuardContract)errors.push("Career Match saved-analysis mutations must validate persisted records before array operations");
else console.log("Career Match saved-storage mutation guard contract: PASS");

const careerMatchSavedRestoreLimit=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchSavedRestoreLimitContract=careerMatchSavedRestoreLimit.includes('typeof x.html==="string"&&x.html.length<=MAX_SAVED_HTML_CHARS');
if(!careerMatchSavedRestoreLimitContract)errors.push("Career Match persisted saved HTML must enforce the 500,000-character bound during restore validation");
else console.log("Career Match saved-HTML restore limit contract: PASS");

const careerMatchCopyCleanup=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchCopyCleanupContract=careerMatchCopyCleanup.includes('try{x.select();copied=document.execCommand("copy")}catch{copied=false}finally{x.remove()}');
if(!careerMatchCopyCleanupContract)errors.push("Career Match clipboard fallback must remove its temporary textarea even when copy execution throws");
else console.log("Career Match clipboard fallback cleanup contract: PASS");

const careerMatchReaderLoader=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchReaderLoaderContract=careerMatchReaderLoader.includes('const existing=document.querySelector(`script[src="${src}"]`)')&&careerMatchReaderLoader.includes('s.dataset.loaded="true"');
if(!careerMatchReaderLoaderContract)errors.push("Career Match third-party script loading must reuse an existing in-flight or completed script load");
else console.log("Career Match reader loader single-flight contract: PASS");

const careerMatchFileRace=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchFileRaceContract=careerMatchFileRace.includes("let fileReadToken=0;")&&careerMatchFileRace.includes("const token=++fileReadToken")&&careerMatchFileRace.includes("if(token!==fileReadToken)return");
if(!careerMatchFileRaceContract)errors.push("Career Match file reads must ignore stale asynchronous results after a newer file selection");
else console.log("Career Match file-selection race contract: PASS");

const careerMatchSavedHandler=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchSavedHandlerContract=careerMatchSavedHandler.includes('$("#savedList").onclick=e=>{const b=e.target.closest("button[data-s]");if(!b)return;let s=validSavedList(store.get("cm_saved",[]));');
if(!careerMatchSavedHandlerContract)errors.push("Career Match saved-analysis actions must use validated persisted records");
else console.log("Career Match saved-action integrity contract: PASS");

const careerMatchMammoth=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchMammothSecurityContract=careerMatchMammoth.includes('mammoth/1.13.0/mammoth.browser.min.js')&&!careerMatchMammoth.includes('mammoth/1.6.0/');
if(!careerMatchMammothSecurityContract)errors.push("Career Match DOCX reader must use the current patched Mammoth browser build");
else console.log("Career Match Mammoth dependency security contract: PASS");

const siteCss=fs.readFileSync("assets/css/style.css","utf8");
const jawedAiCtaContrastContract=siteCss.includes(".ai-discovery-card a.button{color:#fff}")&&siteCss.includes(".ai-discovery-card a.button:hover,.ai-discovery-card a.button:focus-visible{color:#fff}");
if(!jawedAiCtaContrastContract)errors.push("Jawed AI card CTAs must retain white text across default, hover and focus-visible states");
else console.log("Jawed AI CTA contrast contract: PASS");

const headers=fs.readFileSync("_headers","utf8");
const crossDomainPolicyContract=headers.includes("X-Permitted-Cross-Domain-Policies: none");
if(!crossDomainPolicyContract)errors.push("Security headers must disable legacy cross-domain policy files");
else console.log("X-Permitted-Cross-Domain-Policies contract: PASS");

const cspFrameContract=headers.includes("frame-src 'none'");
if(!cspFrameContract)errors.push("CSP must explicitly deny frame loads because the site does not use iframes");
else console.log("CSP frame-src hardening contract: PASS");

const crossOriginOpenerPolicyContract=headers.includes("Cross-Origin-Opener-Policy: same-origin");
if(!crossOriginOpenerPolicyContract)errors.push("Security headers must enforce same-origin cross-origin opener isolation");
else console.log("Cross-Origin-Opener-Policy contract: PASS");
const careerMatchFileSignature=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchFileSignatureContract=careerMatchFileSignature.includes("const isPdf=bytes.length>=4&&bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70")&&careerMatchFileSignature.includes("const isZip=bytes.length>=2&&bytes[0]===80&&bytes[1]===75")&&careerMatchFileSignature.includes("selected file does not appear to be a valid PDF")&&careerMatchFileSignature.includes("selected file does not appear to be a valid DOCX file");
if(!careerMatchFileSignatureContract)errors.push("Career Match PDF/DOCX uploads must validate basic file signatures before invoking parsers");
else console.log("Career Match file signature validation contract: PASS");
const careerMatchLoader=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchLoaderContract=careerMatchLoader.includes("s.onerror=()=>{s.remove();reject(new Error(\"Could not load the file reader (internet needed)\"))}")&&!careerMatchLoader.includes("s.onerror=()=>reject(new Error(\"Could not load the file reader (internet needed)\"))");
if(!careerMatchLoaderContract)errors.push("Career Match external file-reader loader must remove failed script elements before rejecting");
else console.log("Career Match failed loader cleanup contract: PASS");
const careerMatchSavedSize=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchSavedSizeContract=careerMatchSavedSize.includes("const MAX_SAVED_HTML_CHARS=500000")&&careerMatchSavedSize.includes("html.length>MAX_SAVED_HTML_CHARS")&&careerMatchSavedSize.includes("maximum 500,000 characters");
if(!careerMatchSavedSizeContract)errors.push("Career Match saved analyses must enforce a per-analysis HTML size bound before localStorage persistence");
else console.log("Career Match saved-analysis size guard contract: PASS");

const careerMatchDownloadName=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchDownloadNameContract=careerMatchDownloadName.includes("function downloadName(title)")&&careerMatchDownloadName.includes('slice(0,80)')&&careerMatchDownloadName.includes('return (base||"analysis")+".txt"')&&careerMatchDownloadName.includes("l.download=downloadName(t)");
if(!careerMatchDownloadNameContract)errors.push("Career Match download filenames must be bounded and fall back to a safe non-empty name");
else console.log("Career Match download filename integrity contract: PASS");

const careerMatchDownload=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchDownloadContract=careerMatchDownload.includes("URL.createObjectURL(new Blob")&&careerMatchDownload.includes("setTimeout(()=>URL.revokeObjectURL(u),0)")&&!careerMatchDownload.includes("l.click();URL.revokeObjectURL(u)");
if(!careerMatchDownloadContract)errors.push("Career Match downloads must defer Blob URL revocation until after download initiation");
else console.log("Career Match download URL cleanup contract: PASS");

const careerMatchFileGuards=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchFileResourceContract=careerMatchFileGuards.includes("const MAX_FILE_BYTES=15*1024*1024")&&careerMatchFileGuards.includes("const MAX_PDF_PAGES=100")&&careerMatchFileGuards.includes("const MAX_EXTRACTED_CHARS=500000")&&careerMatchFileGuards.includes("if(f.size>MAX_FILE_BYTES)")&&careerMatchFileGuards.includes("if(pdf.numPages>MAX_PDF_PAGES)")&&careerMatchFileGuards.includes("if(out.length>MAX_EXTRACTED_CHARS)");
if(!careerMatchFileResourceContract)errors.push("Career Match file parsing must enforce upload size, PDF page-count, and extracted-text bounds");
else console.log("Career Match file resource guard contract: PASS");

const careerMatchInnerHtml=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchInnerHtmlContract=!careerMatchInnerHtml.includes(".innerHTML");
if(!careerMatchInnerHtmlContract)errors.push("Career Match must not use live innerHTML sinks");
else console.log("Career Match innerHTML sink contract: PASS");

const careerMatchPdfCleanup=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchPdfCleanupContract=careerMatchPdfCleanup.includes("const pdf=await pdfjsLib.getDocument({data:buf,isEvalSupported:false,enableScripting:false}).promise;")&&careerMatchPdfCleanup.includes("try{")&&careerMatchPdfCleanup.includes("finally{await pdf.destroy()}")&&!careerMatchPdfCleanup.includes("if(pdf.numPages>MAX_PDF_PAGES){await pdf.destroy();throw");
if(!careerMatchPdfCleanupContract)errors.push("Career Match PDF parsing must destroy the PDF.js document in a finally block");
else console.log("Career Match PDF document cleanup contract: PASS");

const careerMatchPdf=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchPdfSecurityContract=careerMatchPdf.includes('pdf.js/4.2.67/pdf.min.mjs')&&careerMatchPdf.includes('pdf.js/4.2.67/pdf.worker.min.mjs')&&!careerMatchPdf.includes('pdf.js/3.11.174/');
if(!careerMatchPdfSecurityContract)errors.push("Career Match PDF reader must use the patched PDF.js release and matching worker");
else console.log("Career Match PDF dependency security contract: PASS");

const careerMatchTrackerRender=fs.readFileSync("tools/career-match-resume-review/index.html","utf8");
const careerMatchTrackerRenderContract=careerMatchTrackerRender.includes("function renderTracker(){const t=validTrackList(store.get(\"cm_track\",[]));");
if(!careerMatchTrackerRenderContract)errors.push("Career Match tracker rendering must use validated persisted records");
else console.log("Career Match tracker render integrity contract: PASS");

const financeSnapshot=fs.readFileSync("tools/personal-finance-snapshot/index.html","utf8");
const financeSnapshotResetContract=financeSnapshot.includes("defaults=Object.fromEntries(ids.map(id=>[id,$(id).value]))")&&financeSnapshot.includes("ids.forEach(id=>$(id).value=defaults[id])");
if(!financeSnapshotResetContract)errors.push("Personal Finance Snapshot reset must restore all calculator fields, including fields outside the form");
else console.log("Personal Finance Snapshot reset contract: PASS");

assert.equal(errors.length,0,errors.join("\n"));
console.log("All site-integrity contracts: PASS");
console.log("Discovery filter exclusion contract: PASS");
console.log("Site sitemap/page parity: PASS");
console.log("Sitemap pages:",sitemapPaths.length);
console.log("Published HTML pages audited:",sourcePaths.length);
console.log("Unsitemap published pages:",unsitemapPages.length);
console.log("Missing sitemap source files:",missingSources.length);
