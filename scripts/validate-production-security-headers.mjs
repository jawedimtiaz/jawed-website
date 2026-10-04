import fs from "node:fs";

const contract=JSON.parse(fs.readFileSync("config/production-security-header-contract.json","utf8"));
const failures=[];
const timeoutMs=10000;

async function check(item){
  const url=new URL(item.path,contract.production_origin);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"jawed-production-security/39F"}});
    if(Number.isInteger(item.expected_status)){
      if(response.status!==item.expected_status) failures.push(`${item.path}: expected HTTP ${item.expected_status}, got ${response.status}`);
    }else if(response.status!==200) failures.push(`${item.path}: expected HTTP 200, got ${response.status}`);
    if(response.status>=300&&response.status<400) failures.push(`${item.path}: unexpected redirect (HTTP ${response.status})`);
    for(const required of item.required_headers||[]){
      const actual=(response.headers.get(required.name)||"").trim();
      if(!actual) failures.push(`${item.path}: missing response header ${required.name}`);
      else if(required.includes&&!actual.toLowerCase().includes(required.includes.toLowerCase())) failures.push(`${item.path}: ${required.name} does not include expected value ${required.includes}`);
    }
  }catch(error){
    failures.push(`${item.path}: ${error?.name==="AbortError"?"request timed out":error?.message||"request failed"}`);
  }finally{clearTimeout(timer);}
}

for(const item of contract.checks) await check(item);

if(failures.length){
  console.error("Production Security Header Gate FAILED");
  for(const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Production Security Header Gate PASSED");
console.log(`Origin: ${contract.production_origin}`);
console.log(`Paths checked: ${contract.checks.length}`);
console.log("HSTS, framing, MIME-sniffing, referrer, permissions, COOP and CSP response-header coverage verified.");
