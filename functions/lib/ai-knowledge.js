import knowledge from "./ai-knowledge-data.js";
const STOP_WORDS=new Set(["a","an","and","are","about","can","do","for","from","how","i","in","is","it","me","of","on","or","the","to","what","where","with","you"]);

const QUERY_ALIASES=new Map([
  ["job",["work","employment","role"]],
  ["role",["job","work","employment"]],
  ["career",["work","employment","professional"]],
  ["profession",["work","career","professional"]],
  ["employer",["company","work","employment"]],
  ["employee",["work","employment"]],
  ["mac",["macos","apple"]],
  ["mdm",["device","management"]],
  ["resume",["cv","career","job"]],
  ["cv",["resume","career","job"]],
]);

function normalizeQuery(value){
  return value.toLowerCase()
    .replace(/\b(what|where|who|how|when|why)\s+is\s+([a-z0-9-]+)\b/g,"$1 $2")
    .replace(/\bwhat's\b/g,"what is")
    .replace(/\bwhere's\b/g,"where is")
    .replace(/\bwho's\b/g,"who is")
    .replace(/\bcan't\b/g,"cannot")
    .replace(/\bdoesn't\b/g,"does not");
}

function tokens(value){
  const normalized=normalizeQuery(value).replace(/[^a-z0-9\s-]/g," ");
  const base=normalized.split(/\s+/).filter(word=>word&&!STOP_WORDS.has(word));
  const expanded=[...base];
  for(const token of base){
    const aliases=QUERY_ALIASES.get(token);
    if(aliases)expanded.push(...aliases);
  }
  return expanded;
}

function tokenSet(value){
  return new Set(tokens(value));
}

function scoreEntry(entry,queryCounts){
  const titleTokens=tokenSet(entry.title);
  const summaryTokens=tokenSet(entry.summary);
  const keywordTokens=tokenSet(entry.keywords.join(" "));
  const urlTokens=tokenSet(entry.url);
  let score=0;

  for(const [token,weight] of queryCounts){
    if(titleTokens.has(token))score+=4*weight;
    else if(keywordTokens.has(token))score+=3*weight;
    else if(summaryTokens.has(token))score+=2*weight;
    else if(urlTokens.has(token))score+=weight;
  }

  return score;
}

const MIN_PRIMARY_SOURCES=3;
const IDENTITY_QUERY=/\b(?:who(?:\s+is|\s+was)?|about)\s+(?:is\s+)?(?:jawed|jawed\s+imtiaz)\b/i;
const CURRENT_WORK_QUERY=/\b(?:where|what)\b[\s\S]*\b(?:work(?:ing)?|job|employ(?:ed|er|ment)|company|client)\b/i;
const CONVERSATIONAL_CLOSING=/^\s*(?:ok|okay)?\s*(?:bye|goodbye|good night|see you|see ya|talk to you later|thanks|thank you|thx)\s*[!.]*\s*$/i;
const CONVERSATIONAL_GREETING=/^\s*(?:hi|hello|hey|good morning|good afternoon|good evening)\s*[!.]*\s*$/i;
const VAGUE_FOLLOW_UP_TERMS=new Set(["tell","show","describe","explain","more","another","again","detail","details","clarify","clarification","elaborate","expand","continue","difference","second","first","option","options"]);
const SOURCE_CONTEXT_QUERY=/Previous source context:\s*((?:\/[^,\s]+)(?:,\s*\/[^,\s]+)*)/i;

function rankedEntries(query,weight=1){
  const queryTokens=tokens(query);
  if(!queryTokens.length)return [];
  const queryCounts=new Map();
  for(const token of queryTokens){
    queryCounts.set(token,Math.min(2,(queryCounts.get(token)||0)+weight));
  }
  const queryPhrase=queryTokens.join(" ");

  return knowledge.entries.map(entry=>{
    let score=scoreEntry(entry,queryCounts);
    const searchableText=[entry.title,entry.summary,...entry.keywords].join(" ").toLowerCase();
    if(queryPhrase.length>=5&&searchableText.includes(queryPhrase))score+=3;
    return {...entry,score};
  });
}

export function findRelevantKnowledge(query,limit=5,options={}){
  const intentQuery=typeof options.primaryQuery==="string"&&options.primaryQuery.trim()?options.primaryQuery.trim():query;
  if(CONVERSATIONAL_CLOSING.test(intentQuery)||CONVERSATIONAL_GREETING.test(intentQuery))return [];
  const ranked=rankedEntries(query);
  if(!ranked.length)return [];

  const primaryQuery=typeof options.primaryQuery==="string"?options.primaryQuery.trim():"";
  const intentUrls=IDENTITY_QUERY.test(intentQuery)?new Set(["/about/","/"]):CURRENT_WORK_QUERY.test(intentQuery)?new Set(["/work/experience/","/work/"]):null;
  if(!primaryQuery){
    return ranked
      .filter(entry=>entry.score>=2)
      .sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title))
      .slice(0,limit)
      .map(({score,...entry})=>entry);
  }

  const primary=rankedEntries(primaryQuery)
    .filter(entry=>entry.score>=2)
    .sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));

  const primaryTokens=tokens(primaryQuery);
  const canUseContextForVagueFollowUp=primary.length===0&&(
    primaryTokens.length===0||
    (primaryTokens.length<=2&&primaryTokens.every(token=>VAGUE_FOLLOW_UP_TERMS.has(token)))
  );

  const primaryUrls=new Set(primary.map(entry=>entry.url));
  const contextSourceUrls=(query.match(SOURCE_CONTEXT_QUERY)?.[1]||"").split(/,\s*/).filter(Boolean);
  if(intentUrls){
    const intentPriority=IDENTITY_QUERY.test(intentQuery)
      ? ["/about/","/"]
      : ["/work/experience/","/work/"];
    const intentPrimary=primary.filter(entry=>intentUrls.has(entry.url));
    const intentContext=ranked.filter(entry=>intentUrls.has(entry.url));
    const preferred=[];
    for(const url of intentPriority){
      const primaryEntry=intentPrimary.find(entry=>entry.url===url);
      const contextEntry=intentContext.find(entry=>entry.url===url);
      if(primaryEntry)preferred.push(primaryEntry);
      else if(contextEntry)preferred.push(contextEntry);
    }
    if(preferred.length){
      const selectedPreferred=preferred.slice(0,Math.min(limit,preferred.length));
      const selectedUrls=new Set(selectedPreferred.map(entry=>entry.url));
      const fallback=primary.filter(entry=>!selectedUrls.has(entry.url)).slice(0,limit-selectedPreferred.length);
      return [...selectedPreferred,...fallback].map(({score,...entry})=>entry);
    }
  }
  const selected=primary.slice(0,limit);
  if(selected.length>=MIN_PRIMARY_SOURCES)return selected.map(({score,...entry})=>entry);
  if(selected.length<limit&&(
    primary.length>0||
    canUseContextForVagueFollowUp
  )){
    const context=ranked
      .filter(entry=>entry.score>=2&&!primaryUrls.has(entry.url))
      .sort((a,b)=>{
        const aContext=contextSourceUrls.includes(a.url)?0:1;
        const bContext=contextSourceUrls.includes(b.url)?0:1;
        return aContext-bContext||b.score-a.score||a.title.localeCompare(b.title);
      });
    selected.push(...context.slice(0,limit-selected.length));
  }

  return selected.map(({score,...entry})=>entry);
}

export function knowledgeCount(){return knowledge.entries.length;}

export {MIN_PRIMARY_SOURCES};
