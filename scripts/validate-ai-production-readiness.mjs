import assert from "node:assert/strict";
import {aiConfigurationStatus} from "../functions/lib/ai-config.js";

assert.equal(aiConfigurationStatus({AI_PROVIDER_API_KEY:"test-key"}),"configured");
assert.equal(aiConfigurationStatus({AI_PROVIDER_API_KEY:""}),"not_configured");
assert.equal(aiConfigurationStatus({}),"not_configured");
assert.equal(aiConfigurationStatus(undefined),"not_configured");

console.log("AI production configuration readiness validation OK");
console.log("Configured state detected without exposing secret: yes");
console.log("Missing-key state detected safely: yes");
