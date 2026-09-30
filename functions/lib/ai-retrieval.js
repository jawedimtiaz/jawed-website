const MAX_RETRIEVAL_QUERY_CHARS=6000;
const PRIOR_USER_TURNS=2;

export function buildRetrievalQuery(messages){
  const current=messages.at(-1)?.role==="user"&&typeof messages.at(-1)?.content==="string"?messages.at(-1).content.trim():"";
  if(!current)return "";

  const priorUserMessages=messages
    .slice(0,-1)
    .filter(message=>message?.role==="user"&&typeof message.content==="string")
    .map(message=>message.content.trim())
    .filter(Boolean)
    .slice(-PRIOR_USER_TURNS);

  return [current,...priorUserMessages].join("\n").slice(0,MAX_RETRIEVAL_QUERY_CHARS);
}

export {MAX_RETRIEVAL_QUERY_CHARS,PRIOR_USER_TURNS};
