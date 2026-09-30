import {findRelevantKnowledge,knowledgeCount} from "../lib/ai-knowledge.js";
import {checkRateLimit,getClientKey,MAX_REQUESTS,WINDOW_MS} from "../lib/ai-rate-limit.js";
import {DEFAULT_MODEL,generateGroundedReply} from "../lib/openai-provider.js";

const MAX_BODY_BYTES=12000;
const MAX_MESSAGES=12;
const MAX_MESSAGE_CHARS=2000;
const json=(body,status=200,extraHeaders={})=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...extraHeaders}});

function allowedOrigin(request){
  const origin=request.headers.get("origin");
  return !origin||origin==="https://jawed.co.in";
}

function validConversation(messages){
  return messages.every((message,index)=>message.role===(index%2===0?"user":"assistant"))&&messages[0]?.role==="user";
}

function publicSources(sources){
  return sources.filter(source=>typeof source?.url==="string"&&source.url.startsWith("/")&&!source.url.startsWith("//")&&typeof source.title==="string"&&source.title.trim()).map(source=>({url:source.url,title:source.title}));
}

export async function onRequestPost({request,env}){
  if(!allowedOrigin(request))return json({error:"Origin not allowed."},403);
  const limit=checkRateLimit(getClientKey(request));
  if(!limit.allowed)return json({error:"Too many requests. Please try again shortly.",code:"AI_RATE_LIMITED",retry_after:limit.retryAfter},429,{"retry-after":String(limit.retryAfter)});
  if(request.headers.get("content-type")?.split(";")[0].toLowerCase()!=="application/json")return json({error:"Expected application/json."},415);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"Request is too large."},413);
  let body;
  try{body=JSON.parse(raw)}catch{return json({error:"Invalid JSON."},400)}
  if(!body||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>MAX_MESSAGES)return json({error:"Provide between 1 and 12 messages."},400);
  const messages=body.messages.map(m=>({role:m?.role,content:typeof m?.content==="string"?m.content.trim():""}));
  if(messages.some(m=>!["user","assistant"].includes(m.role)||!m.content||m.content.length>MAX_MESSAGE_CHARS))return json({error:"Each message must have a valid role and a non-empty message of 2,000 characters or fewer."},400);
  if(!validConversation(messages))return json({error:"Conversation messages must alternate between user and assistant, starting with the user."},400);
  if(messages.at(-1).role!=="user")return json({error:"The latest message must be from the user."},400);

  const apiKey=env?.AI_PROVIDER_API_KEY;
  const sources=findRelevantKnowledge(messages.at(-1).content,5);
  const responseSources=publicSources(sources);
  if(!apiKey)return json({error:"AI service is not configured yet.",code:"AI_NOT_CONFIGURED",sources:responseSources},503);

  try{
    const result=await generateGroundedReply({apiKey,model:env?.AI_PROVIDER_MODEL||DEFAULT_MODEL,input:messages,sources});
    return json({reply:result.reply,sources:responseSources,model:result.model});
  }catch(error){
    const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<600?error.status:502;
    return json({error:status===429?"AI service is temporarily busy. Please try again shortly.":"The AI service is temporarily unavailable.",code:"AI_PROVIDER_ERROR"},status===429?429:502);
  }
}

export async function onRequestGet(){
  return json({ok:true,service:"jawed-ai",status:"ready",knowledge_entries:knowledgeCount(),rate_limit:{requests:MAX_REQUESTS,window_seconds:WINDOW_MS/1000,best_effort:true}});
}
