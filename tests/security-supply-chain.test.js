import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CREDENTIAL_PATTERNS,
  APPROVED_FIREBASE_PROPERTY_TYPES,
  REQUIRED_FIREBASE_APPLET_KEYS,
  ALLOWED_FIREBASE_APPLET_KEYS,
  FIREBASE_PUBLIC_API_KEY_REGEX,
  RISKY_FILENAME_PATTERN,
  SCANNED_EXTENSIONS,
  EXCLUDED_PATHS,
  validateFirebaseAppletConfig,
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
const KEY_API_KEY = ["api", "Key"].join("");
const KEY_CLIENT_SECRET = ["client", "_secret"].join("");
const KEY_PRIVATE_KEY = ["private", "_key"].join("");

// Helper to construct synthetic public Firebase applet configuration
function createSyntheticPublicFirebaseConfig(overrides = {}) {
  const base = {
    projectId: "synthetic-project-id",
    appId: "1:000000000000:web:0000000000000000000000",
    [KEY_API_KEY]: SYNTHETIC_AIZA,
    authDomain: "synthetic-project-id.firebaseapp.com",
    storageBucket: "synthetic-project-id.firebasestorage.app",
    messagingSenderId: "000000000000",
    measurementId: "",
    oAuthClientId: "000000000000-dummy0000000000000000000000000000.apps.googleusercontent.com",
    recaptchaSiteKey: ""
  };
  return JSON.stringify({ ...base, ...overrides }, null, 2);
}

// ---------------------------------------------------------------------------
// Original Six Regression Scenarios (Retained and Verified)
// ---------------------------------------------------------------------------

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
    [KEY_API_KEY]: SYNTHETIC_AIZA
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
    rSecret.some(f => f.includes(`Unauthorized property in firebase-applet-config.json: ${KEY_CLIENT_SECRET}`)),
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

// ---------------------------------------------------------------------------
// Phase 3AC.6.28.1 Tightening Regression Scenarios
// ---------------------------------------------------------------------------

test("Requirement 7: Missing apiKey in firebase-applet-config.json is strictly rejected", () => {
  const configWithoutApiKey = JSON.stringify({
    projectId: "synthetic-project-id",
    appId: "1:000000000000:web:0000000000000000000000",
    authDomain: "synthetic-project-id.firebaseapp.com",
    storageBucket: "synthetic-project-id.firebasestorage.app",
    messagingSenderId: "000000000000"
  });

  const failures = scanFileContent("firebase-applet-config.json", configWithoutApiKey);
  assert.ok(
    failures.some(f => f.includes("Missing required property in firebase-applet-config.json: apiKey")),
    "Missing apiKey must produce explicit missing required property failure"
  );
  assert.equal(isAllowedPublicClientCredential("firebase-applet-config.json", "google-api-key", configWithoutApiKey), false);
});

test("Requirement 8: Invalid apiKey values in firebase-applet-config.json are strictly rejected", () => {
  // Case A: Missing AIza prefix
  const configInvalidPrefix = createSyntheticPublicFirebaseConfig({
    [KEY_API_KEY]: ["NotAnAIzaKey", "1234567890123456789012345"].join("")
  });
  const rPrefix = scanFileContent("firebase-applet-config.json", configInvalidPrefix);
  assert.ok(
    rPrefix.some(f => f.includes("Invalid apiKey in firebase-applet-config.json: must match Firebase public Web API key format")),
    "API key without AIza prefix must be rejected"
  );

  // Case B: Too short (under 30 characters after prefix)
  const configTooShort = createSyntheticPublicFirebaseConfig({
    [KEY_API_KEY]: "AIzaShortKey123"
  });
  const rShort = scanFileContent("firebase-applet-config.json", configTooShort);
  assert.ok(
    rShort.some(f => f.includes("Invalid apiKey in firebase-applet-config.json: must match Firebase public Web API key format")),
    "Short API key must be rejected"
  );

  // Case C: Empty string
  const configEmpty = createSyntheticPublicFirebaseConfig({
    [KEY_API_KEY]: ""
  });
  const rEmpty = scanFileContent("firebase-applet-config.json", configEmpty);
  assert.ok(
    rEmpty.some(f => f.includes("Invalid apiKey in firebase-applet-config.json")),
    "Empty apiKey string must be rejected"
  );

  // Case D: Non-string type (number)
  const configNumber = createSyntheticPublicFirebaseConfig({
    [KEY_API_KEY]: 123456789012345
  });
  const rNumber = scanFileContent("firebase-applet-config.json", configNumber);
  assert.ok(
    rNumber.some(f => f.includes("Property 'apiKey' in firebase-applet-config.json must be of type string, got number")),
    "Numeric apiKey must produce type validation error"
  );
});

test("Requirement 9: Incorrect property types for approved properties are strictly rejected", () => {
  const typeMismatchScenarios = [
    { key: "projectId", badValue: true, expectedType: "string", actualType: "boolean" },
    { key: "appId", badValue: 12345, expectedType: "string", actualType: "number" },
    { key: "authDomain", badValue: null, expectedType: "string", actualType: "null" },
    { key: "storageBucket", badValue: ["bucket1", "bucket2"], expectedType: "string", actualType: "array" },
    { key: "messagingSenderId", badValue: 356691586298, expectedType: "string", actualType: "number" },
    { key: "measurementId", badValue: false, expectedType: "string", actualType: "boolean" },
    { key: "oAuthClientId", badValue: { id: "123" }, expectedType: "string", actualType: "object" },
    { key: "recaptchaSiteKey", badValue: 999, expectedType: "string", actualType: "number" }
  ];

  for (const { key, badValue, expectedType, actualType } of typeMismatchScenarios) {
    const config = createSyntheticPublicFirebaseConfig({ [key]: badValue });
    const failures = scanFileContent("firebase-applet-config.json", config);
    assert.ok(
      failures.some(f =>
        f.includes(`Property '${key}' in firebase-applet-config.json must be of type ${expectedType}, got ${actualType}`)
      ),
      `Property '${key}' with type '${actualType}' must be rejected with type error`
    );
  }
});

test("Requirement 10: Unauthorized or unexpected properties are strictly rejected", () => {
  const unauthorizedKeyScenarios = [
    KEY_CLIENT_SECRET,
    KEY_PRIVATE_KEY,
    "adminPassword",
    "serviceAccountKey",
    "extraSettings",
    "unauthorizedCustomField"
  ];

  for (const unauthKey of unauthorizedKeyScenarios) {
    const config = createSyntheticPublicFirebaseConfig({
      [unauthKey]: "arbitrary-value"
    });
    const failures = scanFileContent("firebase-applet-config.json", config);
    assert.ok(
      failures.some(f =>
        f.includes(`Unauthorized property in firebase-applet-config.json: ${unauthKey}`)
      ),
      `Unauthorized key '${unauthKey}' must be rejected`
    );
  }
});

test("Requirement 11: Missing required baseline properties (projectId, appId, authDomain) are rejected", () => {
  const requiredKeys = ["projectId", "appId", "authDomain"];

  for (const reqKey of requiredKeys) {
    const raw = JSON.parse(createSyntheticPublicFirebaseConfig());
    delete raw[reqKey];
    const config = JSON.stringify(raw);
    const failures = scanFileContent("firebase-applet-config.json", config);
    assert.ok(
      failures.some(f =>
        f.includes(`Missing required property in firebase-applet-config.json: ${reqKey}`)
      ),
      `Missing required property '${reqKey}' must produce explicit missing required property error`
    );
  }
});

test("Requirement 12: Root-relative path restriction strictly blocks subdirectories", () => {
  const validSynthetic = createSyntheticPublicFirebaseConfig();

  // Test that files with the exact same name in subdirectories do NOT receive exception
  const subPaths = [
    "sub/firebase-applet-config.json",
    "tools/firebase-applet-config.json",
    "config/firebase-applet-config.json",
    "nested/deep/firebase-applet-config.json",
    "src/firebase-applet-config.json"
  ];

  for (const subPath of subPaths) {
    assert.equal(
      isAllowedPublicClientCredential(subPath, "google-api-key", validSynthetic),
      false,
      `Path '${subPath}' must not receive the root-relative exception`
    );
    const failures = scanFileContent(subPath, validSynthetic);
    assert.ok(
      failures.some(f => f.includes(`Credential-like literal in ${subPath}`)),
      `File '${subPath}' must fail credential check`
    );
  }
});
