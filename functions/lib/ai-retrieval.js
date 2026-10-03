const MAX_RETRIEVAL_QUERY_CHARS=6000;
const PRIOR_USER_TURNS=2;
const SOURCE_PATH_PATTERN=/https:\/\/jawed\.co\.in(\/[^\s)\]]*)/g;
const JAWED_REFERENCE=/\b(?:jawed|jawed\s+imtiaz)\b/i;
const PERSON_PRONOUN=/\b(?:he|him|his|himself)\b/i;
const DEICTIC_REFERENCE=/\b(?:that|this|it)\b/i;
const FOLLOW_UP_REFERENCE=/^\s*(?:tell me more|more about that|what about that|and what about that|can you explain that|explain that)\b/i;

function priorMessages(messages){
  return messages.slice(0,-1).filter(message=>typeof message?.content==="string"&&message.content.trim());
}

function hasJawedContext(messages){
  return priorMessages(messages).some(message=>JAWED_REFERENCE.test(message.content)||/https:\/\/jawed\.co\.in\/(?:about|work\/experience)\//i.test(message.content));
}

function lastSourcePath(messages){
  const candidates=priorMessages(messages).slice().reverse();
  for(const message of candidates){
    const matches=[...message.content.matchAll(SOURCE_PATH_PATTERN)];
    if(matches.length)return matches.at(-1)[1];
  }
  return "";
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
  const sourcePath=lastSourcePath(messages);
  if(sourcePath&&(DEICTIC_REFERENCE.test(resolved)||FOLLOW_UP_REFERENCE.test(resolved))){
    resolved=resolved+" Previous source context: "+sourcePath;
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
    .slice(-PRIOR_USER_TURNS);

  return [contextualCurrent,...priorUserMessages].join("\n").slice(0,MAX_RETRIEVAL_QUERY_CHARS);
}

export {MAX_RETRIEVAL_QUERY_CHARS,PRIOR_USER_TURNS,resolveContextualReference,lastSourcePath};
