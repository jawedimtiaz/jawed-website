(()=>{"use strict";
const init=()=>{
 const j=document.getElementById("jd"),r=document.getElementById("resume"),o=document.getElementById("results"),plan=document.getElementById("plan"),sample=document.getElementById("sample"),clear=document.getElementById("clear");
 if(!j||!r||!o||!plan||!sample||!clear)return false;if(plan.dataset.plannerReady==="true")return true;plan.dataset.plannerReady="true";
 const skills=["service desk","it support","troubleshooting","servicenow","jira","apple","jamf","macos","windows","microsoft 365","active directory","azure","networking","dns","github","javascript","html","css","python","sql","automation","powershell","linux","customer support","documentation","knowledge base","leadership","communication","problem solving","project management","excel","google sheets","apps script"];
 const esc=v=>String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
 const found=v=>skills.filter(x=>v.toLowerCase().includes(x)).slice(0,16);
 const empty=()=>{o.innerHTML='<div class="prep-card"><h2>Your preparation plan</h2><p class="form-note">Paste a job description and build the plan.</p></div>'};
 const build=()=>{
  const jd=j.value.trim(),rv=r.value.trim();
  if(jd.length<80){o.innerHTML='<div class="prep-card"><h2>More detail needed</h2><p>Please paste at least 80 characters from the job description so the planner has enough context.</p></div>';return}
  const detected=found(jd),resumeSkills=found(rv),gap=detected.filter(x=>!resumeSkills.includes(x));
  const questions=["Walk me through a difficult problem you solved and how you narrowed down the cause.","Tell me about a time you had to prioritize several requests.","Describe a situation where your first assumption was wrong. What changed your approach?","Give an example of documentation you created that helped someone else.","Tell me about a time you explained a technical issue to a non-technical stakeholder."];
  detected.slice(0,7).forEach(x=>questions.push("How have you used "+x+" in a real situation? What was the problem, your action and the result?"));
  const topics=detected.length?detected.map(x=>'<span class="tag">'+esc(x)+"</span>").join(""):"<p>No supported skill keywords were detected. Use the responsibilities and requirements in the job description as your main preparation guide.</p>";
  const evidence=rv?(gap.length?"Prepare truthful examples for: "+gap.map(esc).join(", ")+".":"Your resume contains the main detected signals; prepare one concrete example for each major area."):"Prepare 5–7 examples showing ownership, troubleshooting, communication, prioritization and results.";
  o.innerHTML='<div class="prep-card"><h2>Interview preparation plan</h2><h3>Preparation topics</h3><div>'+topics+'</div><h3>Evidence to prepare</h3><p>'+evidence+'</p><h3>Practice questions</h3><ol>'+questions.slice(0,12).map(q=>"<li>"+esc(q)+"</li>").join("")+'</ol><h3>Final checklist</h3><ul><li>Use real examples and measurable outcomes where possible.</li><li>Review the technical fundamentals named in the job description.</li><li>Prepare questions about the role, team and success measures.</li><li>Do not claim skills or results you cannot substantiate.</li></ul></div>';
  o.setAttribute("tabindex","-1");o.focus({preventScroll:true});
 };
 const sampleText="IT Support Engineer. Support Windows and macOS users. Troubleshoot Microsoft 365 sign-in and network connectivity. Manage incidents in ServiceNow, document knowledge-base solutions, automate repetitive tasks with PowerShell and communicate with stakeholders.";
 sample.addEventListener("click",()=>{j.value=sampleText;r.value="IT support professional with Windows and macOS troubleshooting, Microsoft 365 support, ServiceNow documentation and small automation experience.";build()});
 plan.addEventListener("click",build);
 clear.addEventListener("click",()=>{j.value="";r.value="";empty();j.focus()});
 return true;
};
const start=()=>{if(init())return;if(document.readyState!=="loading")setTimeout(init,0)};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else start();
window.addEventListener("pageshow",()=>{if(!document.getElementById("plan"))return;const p=document.getElementById("plan");if(!p.dataset.plannerReady){init()}},{once:true});
})();