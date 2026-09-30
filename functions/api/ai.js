const MAX_BODY_BYTES=12000;
const MAX_MESSAGES=12;
const MAX_MESSAGE_CHARS=2000;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});

function allowedOrigin(request){
  const origin=request.headers.get("origin");
  return !origin||origin==="https://jawed.co.in";
}

export async function onRequestPost({request,env}){
  if(!allowedOrigin(request))return json({error:"Origin not allowed."},403);
  if(request.headers.get("content-type")?.split(";")[0].toLowerCase()!=="application/json")return json({error:"Expected application/json."},415);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"Request is too large."},413);
  let body;
  try{body=JSON.parse(raw)}catch{return json({error:"Invalid JSON."},400)}
  if(!body||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>MAX_MESSAGES)return json({error:"Provide between 1 and 12 messages."},400);
  const messages=body.messages.map(m=>({role:m?.role,content:typeof m?.content==="string"?m.content.trim():""}));
  if(messages.some(m=>!["user","assistant"].includes(m.role)||!m.content||m.content.length>MAX_MESSAGE_CHARS))return json({error:"Each message must have a valid role and a non-empty message of 2,000 characters or fewer."},400);
  if(messages.at(-1).role!=="user")return json({error:"The latest message must be from the user."},400);
  if(!env?.AI_PROVIDER_API_KEY)return json({error:"AI service is not configured yet.",code:"AI_NOT_CONFIGURED"},503);
  return json({error:"AI provider adapter is not enabled yet.",code:"AI_ADAPTER_PENDING"},503);
}

export async function onRequestGet(){return json({ok:true,service:"jawed-ai",status:"preview"});}
