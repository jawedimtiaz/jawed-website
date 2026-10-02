import {MAX_OUTPUT_TOKENS,MAX_REPLY_CHARS,isSafeSourceUrl,sanitizeMarkdownLinks,hasAllowedSourceLink,ensureAllowedSourceLink,validateProviderReply,buildGroundingInstructions} from "./ai-provider-common.js";

const DEFAULT_MODEL="@cf/meta/llama-3.2-1b-instruct";
const PROVIDER_TIMEOUT_MS=30000;

function normalizeProviderError(error){
  const status=Number.isInteger(error?.status)?error.status:502;
  const normalized=new Error(typeof error?.message==="string"&&error.message?error.message:"The Cloudflare Workers AI provider returned an error.");
  normalized.status=status;
  normalized.category=status===429?"PROVIDER_HTTP_429":status>=400&&status<600?"PROVIDER_HTTP_"+status:"PROVIDER_UNKNOWN";
  normalized.providerStage="AI_RUN";
  normalized.providerErrorCode=typeof error?.code==="string"&&/^[a-z0-9_.-]{1,80}$/i.test(error.code)?error.code:"";
  return normalized;
}

export async function generateGroundedReply({ai,model,input,sources}){
  if(!ai||typeof ai.run!=="function"){
    const error=new Error("Cloudflare Workers AI binding is not configured.");
    error.status=503;
    error.category="PROVIDER_NOT_CONFIGURED";
    throw error;
  }
  const instructions=buildGroundingInstructions(input,sources);
  let result;
  try{
    result=await ai.run(model||DEFAULT_MODEL,{
      messages:[
        {role:"system",content:instructions},
        {role:"user",content:"Answer the final USER MESSAGE using the supplied conversation context and Jawed.co.in source context."}
      ],
      max_tokens:MAX_OUTPUT_TOKENS,
      temperature:0.2
    });
  }catch(error){
    throw normalizeProviderError(error);
  }
  const reply=typeof result?.response==="string"?result.response:"";
  const validatedReply=validateProviderReply(reply,sources);
  const sanitizedReply=sanitizeMarkdownLinks(validatedReply,sources);
  const attributedReply=ensureAllowedSourceLink(sanitizedReply,sources);
  if(sources.length&&!hasAllowedSourceLink(attributedReply,sources)){
    const error=new Error("No safe Jawed.co.in source was available for attribution.");
    error.category="PROVIDER_ATTRIBUTION";
    throw error;
  }
  return {reply:attributedReply,model:model||DEFAULT_MODEL};
}

export {DEFAULT_MODEL,MAX_REPLY_CHARS,PROVIDER_TIMEOUT_MS,isSafeSourceUrl,sanitizeMarkdownLinks,hasAllowedSourceLink,validateProviderReply,buildGroundingInstructions};