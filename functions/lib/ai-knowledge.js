import knowledge from "./ai-knowledge-data.js";
const STOP_WORDS=new Set(["a","an","and","are","about","can","do","for","from","how","i","in","is","it","me","of","on","or","the","to","what","where","with","you"]);

function tokens(value){
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g," ").split(/\s+/).filter(word=>word&&!STOP_WORDS.has(word));
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
const VAGUE_FOLLOW_UP_TERMS=new Set(["tell","show","describe","explain","more","another","again","detail","details","clarify","clarification","elaborate","expand","continue","difference","second","first","option","options"]);

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
  const ranked=rankedEntries(query);
  if(!ranked.length)return [];

  const primaryQuery=typeof options.primaryQuery==="string"?options.primaryQuery.trim():"";
  const intentQuery=primaryQuery||query;
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
  if(intentUrls){
    const intentPrimary=primary.filter(entry=>intentUrls.has(entry.url));
    const intentContext=ranked.filter(entry=>intentUrls.has(entry.url));
    const preferred=[...intentPrimary,...intentContext.filter(entry=>!intentPrimary.some(item=>item.url===entry.url))];
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
      .sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
    selected.push(...context.slice(0,limit-selected.length));
  }

  return selected.map(({score,...entry})=>entry);
}

export function knowledgeCount(){return knowledge.entries.length;}

export {MIN_PRIMARY_SOURCES};
