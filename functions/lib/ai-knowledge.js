import knowledge from "../../assets/data/ai-knowledge.json";

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

  const primaryUrls=new Set(primary.map(entry=>entry.url));
  const selected=primary.slice(0,limit);
  if(selected.length<limit){
    const context=ranked
      .filter(entry=>entry.score>=2&&!primaryUrls.has(entry.url))
      .sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
    selected.push(...context.slice(0,limit-selected.length));
  }

  return selected.map(({score,...entry})=>entry);
}

export function knowledgeCount(){return knowledge.entries.length;}
