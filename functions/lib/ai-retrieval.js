const MAX_RETRIEVAL_QUERY_CHARS=6000;
const PRIOR_USER_TURNS=2;
const SOURCE_PATH_PATTERN=/https:\/\/jawed\.co\.in(\/[^\s)\]]*)/g;
const JAWED_REFERENCE=/\b(?:jawed|jawed\s+imtiaz)\b/i;
const PERSON_PRONOUN=/\b(?:he|him|his|himself)\b/i;
const DEICTIC_REFERENCE=/\b(?:that|this|it)\b/i;
const FOLLOW_UP_REFERENCE=/^\s*(?:tell me more|more about that|what about that|and what about that|can you explain that|explain that|explain more|tell me more|more details|elaborate|expand)\b/i;

function priorMessages(messages){
  return messages.slice(0,-1).filter(message=>typeof message?.content==="string"&&message.content.trim());
}

function hasJawedContext(messages){
  return priorMessages(messages).some(message=>JAWED_REFERENCE.test(message.content)||/https:\/\/jawed\.co\.in\/(?:about|work\/experience)\//i.test(message.content));
}

function lastSourcePaths(messages,limit=3){
  const assistantMessages=messages
    .slice(0,-1)
    .filter(message=>message?.role==="assistant"&&typeof message.content==="string"&&message.content.trim());
  const latest=assistantMessages.at(-1);
  if(!latest)return [];
  const paths=[];
  for(const match of latest.content.matchAll(SOURCE_PATH_PATTERN)){
    const path=match[1];
    if(!paths.includes(path))paths.push(path);
    if(paths.length>=limit)break;
  }
  return paths;
}

function lastSourcePath(messages){
  return lastSourcePaths(messages,1)[0]||"";
}

function resolveContextualReference(current,messages){
  const prior=priorMessages(messages);
  if(!prior.length)return current;
  let resolved=current;
  if(hasJawedContext(messages)&&PERSON_PRONOUN.test(resolved)){
    resolved=resolved
      .replace(/\bhe\b/gi,"Jawed")
      .replace(/\bhim\b/gi,"Jawed")
      .replace(/\bhis\b/gi,"Jawed's")
      .replace(/\bhimself\b/gi,"Jawed");
  }
  const sourcePaths=lastSourcePaths(messages);
  if(sourcePaths.length&&(DEICTIC_REFERENCE.test(resolved)||FOLLOW_UP_REFERENCE.test(resolved))){
    resolved=resolved+" Previous source context: "+sourcePaths.join(", ");
  }
  return resolved;
}

export function buildRetrievalQuery(messages){
  const current=messages.at(-1)?.role==="user"&&typeof messages.at(-1)?.content==="string"?messages.at(-1).content.trim():"";
  if(!current)return "";

  const contextualCurrent=resolveContextualReference(current,messages);
  const priorUserMessages=messages
    .slice(0,-1)
    .filter(message=>message?.role==="user"&&typeof message.content==="string")
    .map(message=>message.content.trim())
    .filter(Boolean)
    .slice(-(FOLLOW_UP_REFERENCE.test(current)?1:PRIOR_USER_TURNS));

  return [contextualCurrent,...priorUserMessages].join("\n").slice(0,MAX_RETRIEVAL_QUERY_CHARS);
}

export {MAX_RETRIEVAL_QUERY_CHARS,PRIOR_USER_TURNS,resolveContextualReference,lastSourcePath,lastSourcePaths};
