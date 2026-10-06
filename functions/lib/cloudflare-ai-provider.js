import {MAX_OUTPUT_TOKENS,MAX_REPLY_CHARS,isSafeSourceUrl,sanitizeMarkdownLinks,hasAllowedSourceLink,ensureAllowedSourceLink,validateProviderReply,buildGroundingInstructions,isSafeSourceMetadata} from "./ai-provider-common.js";

const DEFAULT_MODEL="@cf/meta/llama-3.2-1b-instruct";
const PROVIDER_TIMEOUT_MS=30000;
const PROVIDER_TEMPERATURE=0.2;
const FREE_MODEL=DEFAULT_MODEL;
const MAX_PROVIDER_ERROR_MESSAGE_CHARS=512;

function normalizeProviderError(error){
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<600?error.status:502;
  const rawMessage=typeof error?.message==="string"&&error.message?error.message:"The Cloudflare Workers AI provider returned an error.";
  const message=rawMessage.slice(0,MAX_PROVIDER_ERROR_MESSAGE_CHARS);
  const normalized=new Error(message);
  normalized.status=status;
  normalized.category=status===429?"PROVIDER_HTTP_429":"PROVIDER_HTTP_"+status;
  normalized.providerStage="AI_RUN";
  normalized.providerErrorCode=typeof error?.code==="string"&&/^[a-z0-9_.-]{1,80}$/i.test(error.code)?error.code:Number.isInteger(error?.code)&&error.code>=0&&error.code<=999999?String(error.code):/\b(3036|5035)\b/.exec(message)?.[1]||"";
  return normalized;
}

function withProviderTimeout(promise,timeoutMs=PROVIDER_TIMEOUT_MS){
  const safeTimeout=Number.isFinite(timeoutMs)&&timeoutMs>0?Math.min(timeoutMs,PROVIDER_TIMEOUT_MS):PROVIDER_TIMEOUT_MS;
  let timer;
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>{
      const error=new Error("Cloudflare Workers AI provider timed out.");
      error.status=504;
      error.category="PROVIDER_TIMEOUT";
      error.providerStage="AI_RUN";
      reject(error);
    },safeTimeout);
  });
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}

export async function generateGroundedReply({ai,model,input,sources}={}){
  if(!ai||typeof ai.run!=="function"){
    const error=new Error("Cloudflare Workers AI binding is not configured.");
    error.status=503;
    error.category="PROVIDER_NOT_CONFIGURED";
    throw error;
  }
  const safeSources=Array.isArray(sources)?sources.filter(isSafeSourceMetadata).slice(0,5):[];
  const instructions=buildGroundingInstructions(input,safeSources);
  let result;
  try{
    result=await withProviderTimeout(ai.run(FREE_MODEL,{
      messages:[
        {role:"system",content:instructions},
        {role:"user",content:"Answer the final USER MESSAGE using the supplied conversation context and Jawed.co.in source context."}
      ],
      max_tokens:MAX_OUTPUT_TOKENS,
      temperature:PROVIDER_TEMPERATURE
    }));
  }catch(error){
    if(error?.category==="PROVIDER_TIMEOUT")throw error;
    throw normalizeProviderError(error);
  }
  const reply=typeof result?.response==="string"?result.response:"";
  const validatedReply=validateProviderReply(reply,safeSources);
  const sanitizedReply=sanitizeMarkdownLinks(validatedReply,safeSources);
  const attributedReply=ensureAllowedSourceLink(sanitizedReply,safeSources);
  if(safeSources.length&&!hasAllowedSourceLink(attributedReply,safeSources)){
    const error=new Error("No safe Jawed.co.in source was available for attribution.");
    error.category="PROVIDER_ATTRIBUTION";
    throw error;
  }
  return {reply:attributedReply,model:FREE_MODEL};
}

export {DEFAULT_MODEL,FREE_MODEL,MAX_OUTPUT_TOKENS,MAX_REPLY_CHARS,PROVIDER_TIMEOUT_MS,PROVIDER_TEMPERATURE,MAX_PROVIDER_ERROR_MESSAGE_CHARS,withProviderTimeout,isSafeSourceUrl,sanitizeMarkdownLinks,hasAllowedSourceLink,validateProviderReply,buildGroundingInstructions,normalizeProviderError};