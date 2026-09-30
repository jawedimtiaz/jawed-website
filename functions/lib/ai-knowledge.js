import knowledge from "../../assets/data/ai-knowledge.json";

const STOP_WORDS=new Set(["a","an","and","are","about","can","do","for","from","how","i","in","is","it","me","of","on","or","the","to","what","where","with","you"]);

function tokens(value){
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g," ").split(/\s+/).filter(word=>word&&!STOP_WORDS.has(word));
}

function tokenSet(value){
  return new Set(tokens(value));
}

export function findRelevantKnowledge(query,limit=5,options={}){
  const queryTokens=tokens(query);
  const primaryTokens=tokens(options.primaryQuery||"");
  if(!queryTokens.length)return [];

  const primarySet=new Set(primaryTokens);
  const queryCounts=new Map();
  for(const token of queryTokens){
    queryCounts.set(token,Math.min(1,(queryCounts.get(token)||0)+1));
  }
  for(const token of primarySet){
    queryCounts.set(token,2);
  }
  const querySet=new Set(queryCounts);
  const queryPhrase=queryTokens.join(" ");
  return knowledge.entries.map(entry=>{
    const titleTokens=tokenSet(entry.title);
    const summaryTokens=tokenSet(entry.summary);
    const keywordTokens=tokenSet(entry.keywords.join(" "));
    const urlTokens=tokenSet(entry.url);
    let score=0;

    for(const token of querySet){
      const weight=queryCounts.get(token)||1;
      if(titleTokens.has(token))score+=4*weight;
      else if(keywordTokens.has(token))score+=3*weight;
      else if(summaryTokens.has(token))score+=2*weight;
      else if(urlTokens.has(token))score+=1*weight;
    }

    const searchableText=[entry.title,entry.summary,...entry.keywords].join(" ").toLowerCase();
    if(queryPhrase.length>=5&&searchableText.includes(queryPhrase))score+=3;

    return {...entry,score};
  })
    .filter(entry=>entry.score>=2)
    .sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title))
    .slice(0,limit)
    .map(({score,...entry})=>entry);
}

export function knowledgeCount(){return knowledge.entries.length;}
