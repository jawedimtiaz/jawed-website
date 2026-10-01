import {findRelevantKnowledge,knowledgeCount} from "../lib/ai-knowledge.js";
import {checkRateLimit,getClientKey,MAX_REQUESTS,WINDOW_MS} from "../lib/ai-rate-limit.js";
import {DEFAULT_MODEL,generateGroundedReply} from "../lib/openai-provider.js";
import {buildRetrievalQuery} from "../lib/ai-retrieval.js";
import {aiConfigurationStatus} from "../lib/ai-config.js";

const MAX_BODY_BYTES=12000;
const MAX_MESSAGES=12;
const MAX_MESSAGE_CHARS=2000;
const json=(body,status=200,extraHeaders={})=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...extraHeaders}});
const requestId=()=>crypto.randomUUID();
const failure=(error,code,status,id,extra={})=>{
  console.error(JSON.stringify({event:"ai_request_failure",request_id:id,code,status,...extra}));
  return json({error,code,request_id:id},status,{"x-request-id":id});
};

function allowedOrigin(request){
  const origin=request.headers.get("origin");
  return !origin||origin==="https://jawed.co.in";
}

function validConversation(messages){
  return messages.every((message,index)=>message.role===(index%2===0?"user":"assistant"))&&messages[0]?.role==="user";
}

function publicSources(sources){
  return sources.filter(source=>typeof source?.url==="string"&&source.url.startsWith("/")&&!source.url.startsWith("//")&&!source.url.includes("\\")&&typeof source.title==="string"&&source.title.trim()&&typeof source.summary==="string"&&Array.isArray(source.keywords)).map(source=>({url:source.url,title:source.title,summary:source.summary,keywords:source.keywords.filter(keyword=>typeof keyword==="string").slice(0,20)}));
}

export async function onRequestPost({request,env}){
  const id=requestId();
  if(!allowedOrigin(request))return failure("Origin not allowed.","AI_ORIGIN_NOT_ALLOWED",403,id);
  const limit=checkRateLimit(getClientKey(request));
  if(!limit.allowed)return failure("Too many requests. Please try again shortly.","AI_RATE_LIMITED",429,id,{retry_after:limit.retryAfter});
  if(request.headers.get("content-type")?.split(";")[0].toLowerCase()!=="application/json")return failure("Expected application/json.","AI_INVALID_CONTENT_TYPE",415,id);
  const declaredLength=Number(request.headers.get("content-length"));
  if(Number.isFinite(declaredLength)&&declaredLength>MAX_BODY_BYTES)return failure("Request is too large.","AI_REQUEST_TOO_LARGE",413,id);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return failure("Request is too large.","AI_REQUEST_TOO_LARGE",413,id);
  let body;
  try{body=JSON.parse(raw)}catch{return failure("Invalid JSON.","AI_INVALID_JSON",400,id);}
  if(!body||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>MAX_MESSAGES)return failure("Provide between 1 and 12 messages.","AI_INVALID_CONVERSATION",400,id);
  const messages=body.messages.map(m=>({role:m?.role,content:typeof m?.content==="string"?m.content.trim():""}));
  if(messages.some(m=>!["user","assistant"].includes(m.role)||!m.content||m.content.length>MAX_MESSAGE_CHARS))return failure("Each message must have a valid role and a non-empty message of 2,000 characters or fewer.","AI_INVALID_MESSAGE",400,id);
  if(!validConversation(messages))return failure("Conversation messages must alternate between user and assistant, starting with the user.","AI_INVALID_CONVERSATION",400,id);
  if(messages.at(-1).role!=="user")return failure("The latest message must be from the user.","AI_INVALID_CONVERSATION",400,id);

  const apiKey=env?.AI_PROVIDER_API_KEY;
  let responseSources=[];
  try{
    const retrievalQuery=buildRetrievalQuery(messages);
    const sources=findRelevantKnowledge(retrievalQuery,5,{primaryQuery:messages.at(-1).content});
    responseSources=publicSources(sources);
  }catch(error){
    return failure("The AI knowledge service is temporarily unavailable.","AI_RETRIEVAL_ERROR",502,id);
  }
  if(!apiKey){
    console.warn(JSON.stringify({event:"ai_request_unconfigured",request_id:id,code:"AI_NOT_CONFIGURED",matched_count:responseSources.length}));
    return json({error:"AI service is not configured yet.",code:"AI_NOT_CONFIGURED",request_id:id,sources:responseSources},503,{"x-request-id":id});
  }

  try{
    const result=await generateGroundedReply({apiKey,model:env?.AI_PROVIDER_MODEL||DEFAULT_MODEL,input:messages,sources});
    console.info(JSON.stringify({event:"ai_request_success",request_id:id,matched_count:responseSources.length,model:result.model}));
    return json({reply:result.reply,sources:responseSources,model:result.model,request_id:id},200,{"x-request-id":id});
  }catch(error){
    const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<600?error.status:502;
    return failure(status===429?"AI service is temporarily busy. Please try again shortly.":"The AI service is temporarily unavailable.","AI_PROVIDER_ERROR",status===429?429:502,id,{provider_status:status});
  }
}

export async function onRequestGet({request,env}={}){
  const id=requestId();
  const configuration=aiConfigurationStatus(env);
  return json({
    ok:configuration==="configured",
    service:"jawed-ai",
    status:configuration==="configured"?"ready":"not_configured",
    configuration,
    model:env?.AI_PROVIDER_MODEL||DEFAULT_MODEL,
    knowledge_entries:knowledgeCount(),
    rate_limit:{requests:MAX_REQUESTS,window_seconds:WINDOW_MS/1000,best_effort:true},
    request_id:id
  },200,{"x-request-id":id});
}
