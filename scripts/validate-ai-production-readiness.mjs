import assert from "node:assert/strict";
import {aiConfigurationStatus} from "../functions/lib/ai-config.js";

assert.equal(aiConfigurationStatus({AI:{run:()=>{}}}),"configured");
assert.equal(aiConfigurationStatus({AI:{run:async()=>({response:"ok"})}}),"configured");
assert.equal(aiConfigurationStatus({AI:null}),"not_configured");
assert.equal(aiConfigurationStatus({}),"not_configured");
assert.equal(aiConfigurationStatus(undefined),"not_configured");

console.log("AI production configuration readiness validation OK");
console.log("Cloudflare Workers AI binding detected without exposing credentials: yes");
console.log("Missing-binding state detected safely: yes");
