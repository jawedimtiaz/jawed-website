import {isSafeSourceUrl} from "./ai-provider-common.js";

const MAX_RETRIEVAL_QUERY_CHARS=6000;
const PRIOR_USER_TURNS=2; // bounded conversational context
const SOURCE_PATH_PATTERN=/https:\/\/jawed\.co\.in(\/[^\s)\]]*)/g;
const JAWED_REFERENCE=/\b(?:jawed|jawed\s+imtiaz)\b/i;
const PERSON_PRONOUN=/\b(?:he|him|his|himself)\b/i;
const DEICTIC_REFERENCE=/\b(?:that|this|it)\b/i;
const FOLLOW_UP_REFERENCE=/^\s*(?:tell me more|more about that|what about that|and what about that|can you explain that|explain that|explain more|tell me more|more details|elaborate|expand)\b/i;

function normalizedMessages(messages){return Array.isArray(messages)?messages:[];}
function priorMessages(messages){return normalizedMessages(messages).slice(0,-1).filter(message=>typeof message?.content==="string"&&message.content.trim());}
function priorUserMessages(messages){return normalizedMessages(messages).slice(0,-1).filter(message=>message?.role==="user"&&typeof message.content==="string"&&message.content.trim());}
function hasJawedContext(messages){return priorMessages(messages).some(message=>JAWED_REFERENCE.test(message.content));}

function lastSourcePaths(messages,limit=3){
  const assistantMessages=normalizedMessages(messages).slice(0,-1).filter(message=>message?.role==="assistant"&&typeof message.content==="string"&&message.content.trim());
  const latest=assistantMessages.at(-1);
  if(!latest)return [];
  const safeLimit=Number.isInteger(limit)&&limit>0?Math.min(limit,3):3;
  const paths=[];
  for(const match of latest.content.matchAll(SOURCE_PATH_PATTERN)){
    const path=match[1];
    if(!isSafeSourceUrl(path))continue;
    if(!paths.includes(path))paths.push(path);
    if(paths.length>=safeLimit)break;
  }
  return paths;
}
function lastSourcePath(messages){return lastSourcePaths(messages,1)[0]||"";}

function resolveContextualReference(current,messages){
  const prior=priorMessages(messages);
  if(typeof current!=="string"||!current.trim())return "";
  if(!prior.length)return current;
  let resolved=current;
  const jawedContext=prior.some(message=>message.content.toLowerCase().includes("jawed"));
  if(jawedContext&&/^where does he work\??$/i.test(resolved))resolved="Where does Jawed work?";
  else if(jawedContext&&PERSON_PRONOUN.test(resolved)){
    resolved=resolved.replace(/\bhe\b/gi,"Jawed").replace(/\bhim\b/gi,"Jawed").replace(/\bhis\b/gi,"Jawed's").replace(/\bhimself\b/gi,"Jawed");
  }
  const sourcePaths=lastSourcePaths(messages);
  if(sourcePaths.length&&(DEICTIC_REFERENCE.test(resolved)||FOLLOW_UP_REFERENCE.test(resolved)))resolved=resolved+" Previous source context: "+sourcePaths.join(", ");
  return resolved;
}

export function buildRetrievalQuery(messages){
  const history=normalizedMessages(messages);
  const rawCurrent=history.at(-1)?.role==="user"&&typeof history.at(-1)?.content==="string"?history.at(-1).content.trim():"";
  const current=/^where does he work\??$/i.test(rawCurrent)&&history.slice(0,-1).some(message=>typeof message?.content==="string"&&message.content.toLowerCase().includes("jawed"))?"Where does Jawed work?":rawCurrent;
  if(!current)return "";

  const contextualCurrent=resolveContextualReference(current,history);
  if(current.length>=MAX_RETRIEVAL_QUERY_CHARS)return current.slice(0,MAX_RETRIEVAL_QUERY_CHARS);

  const contextualSuffix=contextualCurrent.startsWith(current)?contextualCurrent.slice(current.length):"";
  const currentBudget=MAX_RETRIEVAL_QUERY_CHARS-current.length;
  const boundedCurrent=current+contextualSuffix.slice(0,currentBudget);
  const remainingBudget=MAX_RETRIEVAL_QUERY_CHARS-boundedCurrent.length;
  if(remainingBudget<=0)return boundedCurrent;

  const priorUserMessages=history
    .slice(0,-1)
    .filter(message=>message?.role==="user"&&typeof message.content==="string")
    .map(message=>message.content.trim())
    .filter(Boolean)
    .slice(-(FOLLOW_UP_REFERENCE.test(current)?1:PRIOR_USER_TURNS));

  const priorText=priorUserMessages.join("\n");
  return boundedCurrent+(priorText?("\n"+priorText).slice(0,Math.max(0,remainingBudget)):"");
}

export {MAX_RETRIEVAL_QUERY_CHARS,PRIOR_USER_TURNS,resolveContextualReference,lastSourcePath,lastSourcePaths};