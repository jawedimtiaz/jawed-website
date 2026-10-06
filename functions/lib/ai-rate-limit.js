const WINDOW_MS=60000;
const MAX_REQUESTS=8;
const buckets=new Map();
const MAX_BUCKETS=2_000;

function cleanup(now){
  for(const [key,bucket] of buckets){
    if(now-bucket.windowStart>=WINDOW_MS)buckets.delete(key);
  }
  if(buckets.size<=MAX_BUCKETS)return;
  const oldest=[...buckets.entries()].sort((a,b)=>a[1].windowStart-b[1].windowStart);
  for(let i=0;i<oldest.length-MAX_BUCKETS;i++)buckets.delete(oldest[i][0]);
}

export function getClientKey(request){
  const ip=request?.headers?.get?.("cf-connecting-ip");
  return ip&&ip.length<=100?ip:"anonymous";
}

export function checkRateLimit(key,now=Date.now()){
  cleanup(now);
  const safeKey=typeof key==="string"&&key.length<=100?key:"anonymous";
  const safeNow=Number.isFinite(now)?now:Date.now();
  const current=buckets.get(safeKey);
  if(!current||safeNow-current.windowStart>=WINDOW_MS){
    buckets.set(safeKey,{windowStart:safeNow,count:1});
    return {allowed:true,retryAfter:0};
  }
  if(current.count>=MAX_REQUESTS){
    return {allowed:false,retryAfter:Math.max(1,Math.ceil((current.windowStart+WINDOW_MS-safeNow)/1000))};
  }
  current.count+=1;
  return {allowed:true,retryAfter:0};
}

export {MAX_REQUESTS,WINDOW_MS};
