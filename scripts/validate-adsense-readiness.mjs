#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const validators = [
  "validate-adsense-privacy.mjs",
  "validate-adsense-inventory.mjs",
  "validate-adsense-activation.mjs",
  "validate-adsense-content-readiness.mjs",
  "validate-adsense-placement-policy.mjs",
  "validate-adsense-technical.mjs",
  "validate-adsense-slot-architecture.mjs",
  "validate-adsense-mobile-readiness.mjs",
  "validate-adsense-consent-performance.mjs",
  "validate-adsense-performance-safeguards.mjs",
  "validate-adsense-final-performance-gate.mjs",
  "validate-adsense-final-readiness.mjs",
  "validate-adsense-preactivation.mjs"
];

console.log("AdSense readiness aggregate gate");
console.log(`Validator count: ${validators.length}`);

for (const validator of validators) {
  console.log(`\n>>> ${validator}`);
  const result = spawnSync(process.execPath, [`scripts/${validator}`], {
    stdio: "inherit"
  });

  if (result.error) {
    console.error(`Failed to execute ${validator}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`AdSense readiness gate: FAIL at ${validator}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nAdSense readiness aggregate gate: PASS");
console.log("State: Ready-gated pre-activation; runtime inactive");
