import knowledge from "../../assets/data/ai-knowledge.json";

const STOP_WORDS=new Set(["a","an","and","are","about","can","do","for","from","how","i","in","is","it","me","of","on","or","the","to","what","where","with","you"]);

function tokens(value){
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g," ").split(/\s+/).filter(word=>word&&!STOP_WORDS.has(word));
}

export function findRelevantKnowledge(query,limit=5){
  const queryTokens=tokens(query);
  if(!queryTokens.length)return [];
  return knowledge.entries.map(entry=>{
    const haystack=tokens([entry.title,entry.summary,entry.keywords.join(" "),entry.url].join(" "));
    const haystackSet=new Set(haystack);
    let score=0;
    for(const token of queryTokens){
      if(haystackSet.has(token))score+=entry.title.toLowerCase().includes(token)?3:1;
    }
    return {...entry,score};
  }).filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,limit).map(({score,...entry})=>entry);
}

export function knowledgeCount(){return knowledge.entries.length;}
