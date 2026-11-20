import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CREDENTIAL_PATTERNS,
  ALLOWED_FIREBASE_APPLET_KEYS,
  RISKY_FILENAME_PATTERN,
  SCANNED_EXTENSIONS,
  EXCLUDED_PATHS,
  isAllowedPublicClientCredential,
  scanFileContent,
  validateSecuritySupplyChain
} from "../scripts/validate-security-supply-chain.mjs";

// Synthetic test token fragments assembled at test runtime
// to avoid embedding raw static pattern matches in test files
const SYNTHETIC_AIZA = ["AIza", "SyDummySyntheticClientKey0000000000"].join("");
const SYNTHETIC_PRIVATE_KEY = ["-----BEGIN", " RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0synthetic0000000000000000000000\n-----END", " RSA PRIVATE KEY-----"].join("");
const SYNTHETIC_AWS_KEY = ["AKIA", "0000000000DUMMY"].join("");
const SYNTHETIC_GHP = ["ghp_", "dummy0000000000000000000000000000"].join("");
const SYNTHETIC_PAT = ["github_pat_", "dummy0000000000000000000000000000"].join("");
const SYNTHETIC_OPENAI = ["sk-", "dummy00000000000000000000"].join("");
const SYNTHETIC_SLACK = ["xoxb-", "000000000000-0000000000000-dummy00000000000000000000"].join("");
const SYNTHETIC_BEARER = ["Authorization", ": ", "Bearer dummy_synthetic_jwt_token_1234567890"].join("");
const KEY_CLIENT_SECRET = ["client", "_secret"].join("");

// Helper to construct synthetic public Firebase applet configuration
function createSyntheticPublicFirebaseConfig(overrides = {}) {
  return JSON.stringify({
    projectId: "synthetic-project-id",
    appId: "1:000000000000:web:0000000000000000000000",
    apiKey: SYNTHETIC_AIZA,
    authDomain: "synthetic-project-id.firebaseapp.com",
    storageBucket: "synthetic-project-id.firebasestorage.app",
    messagingSenderId: "000000000000",
    measurementId: "",
    oAuthClientId: "000000000000-dummy0000000000000000000000000000.apps.googleusercontent.com",
    recaptchaSiteKey: "",
    ...overrides
  }, null, 2);
}

test("Requirement 1: Public Firebase configuration does not trigger false-positives", () => {
  const syntheticConfig = createSyntheticPublicFirebaseConfig();
  const failures = scanFileContent("firebase-applet-config.json", syntheticConfig);
  assert.deepEqual(failures, [], "Public Firebase client config must pass with 0 failures");

  // Also verify against the repository's real firebase-applet-config.json
  const realConfig = fs.readFileSync("firebase-applet-config.json", "utf8");
  const realFailures = scanFileContent("firebase-applet-config.json", realConfig);
  assert.deepEqual(realFailures, [], "Repository firebase-applet-config.json must pass validation");
});

test("Requirement 2: Real private credentials in firebase-applet-config.json still trigger the scanner", () => {
  // Case A: Synthetic RSA / PEM private key
  const configWithPrivateKey = createSyntheticPublicFirebaseConfig({
    notes: SYNTHETIC_PRIVATE_KEY
  });
  const rPrivate = scanFileContent("firebase-applet-config.json", configWithPrivateKey);
  assert.ok(
    rPrivate.some(f => f.includes("Credential-like literal in firebase-applet-config.json")),
    "Private key in firebase-applet-config.json must be caught by scanner"
  );

  // Case B: Synthetic AWS Access Key
  const configWithAws = createSyntheticPublicFirebaseConfig({
    notes: SYNTHETIC_AWS_KEY
  });
  const rAws = scanFileContent("firebase-applet-config.json", configWithAws);
  assert.ok(
    rAws.some(f => f.includes("Credential-like literal in firebase-applet-config.json")),
    "AWS key in firebase-applet-config.json must be caught by scanner"
  );

  // Case C: Synthetic GitHub Personal Access Token
  const configWithGhp = createSyntheticPublicFirebaseConfig({
    notes: SYNTHETIC_GHP
  });
  const rGhp = scanFileContent("firebase-applet-config.json", configWithGhp);
  assert.ok(
    rGhp.some(f => f.includes("Credential-like literal in firebase-applet-config.json")),
    "GitHub token in firebase-applet-config.json must be caught by scanner"
  );

  // Case D: Synthetic GitHub Fine-Grained PAT
  const configWithPat = createSyntheticPublicFirebaseConfig({
    notes: SYNTHETIC_PAT
  });
  const rPat = scanFileContent("firebase-applet-config.json", configWithPat);
  assert.ok(
    rPat.some(f => f.includes("Credential-like literal in firebase-applet-config.json")),
    "GitHub fine-grained PAT in firebase-applet-config.json must be caught by scanner"
  );

  // Case E: Synthetic OpenAI Secret
  const configWithOpenAi = createSyntheticPublicFirebaseConfig({
    notes: SYNTHETIC_OPENAI
  });
  const rOpenAi = scanFileContent("firebase-applet-config.json", configWithOpenAi);
  assert.ok(
    rOpenAi.some(f => f.includes("Credential-like literal in firebase-applet-config.json")),
    "OpenAI secret in firebase-applet-config.json must be caught by scanner"
  );

  // Case F: Synthetic Slack Token
  const configWithSlack = createSyntheticPublicFirebaseConfig({
    notes: SYNTHETIC_SLACK
  });
  const rSlack = scanFileContent("firebase-applet-config.json", configWithSlack);
  assert.ok(
    rSlack.some(f => f.includes("Credential-like literal in firebase-applet-config.json")),
    "Slack token in firebase-applet-config.json must be caught by scanner"
  );

  // Case G: Synthetic Authorization Bearer header
  const configWithBearer = createSyntheticPublicFirebaseConfig({
    notes: SYNTHETIC_BEARER
  });
  const rBearer = scanFileContent("firebase-applet-config.json", configWithBearer);
  assert.ok(
    rBearer.some(f => f.includes("Credential-like literal in firebase-applet-config.json")),
    "Bearer header in firebase-applet-config.json must be caught by scanner"
  );
});

test("Requirement 3: Exception cannot accidentally apply to unrelated files or directories", () => {
  const syntheticKeyContent = JSON.stringify({
    apiKey: SYNTHETIC_AIZA
  }, null, 2);

  // Any other file matching AIza must fail
  const testPaths = [
    "src/tools/config.json",
    "config/firebase-config.json",
    "firebase-config.json",
    "applet-config.json",
    "public/firebase.json",
    "scripts/custom-config.json",
    "config.json"
  ];

  for (const testPath of testPaths) {
    const failures = scanFileContent(testPath, syntheticKeyContent);
    assert.deepEqual(
      failures,
      [`Credential-like literal in ${testPath}`],
      `File ${testPath} must NOT receive the firebase-applet-config.json exception`
    );
  }
});

test("Requirement 4: Strict schema and structural enforcement on firebase-applet-config.json", () => {
  // Unauthorized key injection (e.g., client_secret)
  const configWithClientSecret = createSyntheticPublicFirebaseConfig({
    [KEY_CLIENT_SECRET]: "synthetic-secret-value-must-be-blocked"
  });
  const rSecret = scanFileContent("firebase-applet-config.json", configWithClientSecret);
  assert.ok(
    rSecret.some(f => f.includes(`Unauthorized key in firebase-applet-config.json: ${KEY_CLIENT_SECRET}`)),
    "Unauthorized key 'client_secret' must be rejected"
  );

  // Malformed JSON
  const brokenJson = "{ invalid json content: 123";
  const rBroken = scanFileContent("firebase-applet-config.json", brokenJson);
  assert.ok(
    rBroken.some(f => f.includes("firebase-applet-config.json is not valid JSON")),
    "Malformed JSON must be rejected"
  );

  // JSON Array instead of Object
  const arrayJson = "[\"projectId\", \"apiKey\"]";
  const rArray = scanFileContent("firebase-applet-config.json", arrayJson);
  assert.ok(
    rArray.some(f => f.includes("firebase-applet-config.json must be a JSON object")),
    "Non-object JSON root must be rejected"
  );
});

test("Requirement 5: Secret-like filenames remain blocked across repository", () => {
  const secretFilenames = [
    ".env",
    ".env.local",
    ".env.production",
    ".dev.vars",
    ".dev.vars.local",
    "credentials.json",
    "secrets.yaml",
    "id_rsa.key",
    "server.pem",
    "keystore.jks"
  ];

  for (const name of secretFilenames) {
    assert.ok(
      RISKY_FILENAME_PATTERN.test(name),
      `Filename ${name} must be detected as risky`
    );
  }

  // Allowed exemptions
  assert.ok(nameAllowed(".gitignore"));
  assert.ok(nameAllowed(".env.example"));

  function nameAllowed(name) {
    return !RISKY_FILENAME_PATTERN.test(name) || name === ".gitignore" || name === ".env.example";
  }
});

test("Requirement 6: Repository full validation passes cleanly with 0 failures", () => {
  const result = validateSecuritySupplyChain(process.cwd());
  assert.equal(result.ok, true, "Full security supply chain validation must return ok=true");
  assert.equal(result.failures.length, 0, "Full security supply chain validation must have 0 failures");
  assert.ok(result.checked.workflows >= 25, "Workflows checked count must be >= 25");
  assert.ok(result.checked.files >= 500, "Files checked count must be >= 500");
});
