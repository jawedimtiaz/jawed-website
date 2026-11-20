import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Phase 38C / Phase 3AC.6.28 — Security and Supply-Chain Baseline Validator
 *
 * Enforces repository-wide secret detection, workflow governance, and supply chain integrity.
 * Includes narrowly scoped, documented exception for public Firebase Web Client configuration.
 */

export const RISKY_FILENAME_PATTERN =
  /^(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|credentials?(?:\..*)?|secrets?(?:\..*)?|.*\.(?:pem|key|p12|pfx|jks|keystore))$/i;

export const SCANNED_EXTENSIONS =
  /\.(?:js|mjs|json|yml|yaml|html|css|txt|toml|conf|config|example)$/i;

export const EXCLUDED_PATHS =
  /^(?:docs\/|scripts\/validate-.*\.mjs$)/;

export const CREDENTIAL_PATTERNS = [
  { id: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?PRIVATE KEY-----/ },
  { id: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { id: "github-pat", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { id: "aws-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { id: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { id: "openai-secret", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { id: "generic-secret-literal", pattern: /\b(?:api[_-]?key|client[_-]?secret|password|private[_-]?key)\s*[:=]\s*["'][^"']{20,}["']/i },
  { id: "bearer-token", pattern: /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._~-]{20,}/i }
];

/**
 * Approved public client keys for Firebase Web Client SDK configuration.
 * Per official Google Firebase documentation, the Web API key (AIza...) is a public
 * client identifier bundled into frontend assets, not a private secret or service account key.
 */
export const ALLOWED_FIREBASE_APPLET_KEYS = new Set([
  "projectId",
  "appId",
  "apiKey",
  "authDomain",
  "storageBucket",
  "messagingSenderId",
  "measurementId",
  "oAuthClientId",
  "recaptchaSiteKey"
]);

/**
 * Narrowly scoped, documented exception for public client configuration.
 *
 * Safety boundaries:
 * 1. Scoped strictly to the single file "firebase-applet-config.json".
 * 2. Only permits the public Google/Firebase client key pattern (AIza...).
 * 3. Validates that the file contains only approved public Firebase client properties.
 * 4. All other secret patterns (private keys, AWS/GitHub/OpenAI tokens, generic secrets, etc.)
 *    continue to be strictly enforced even within this configuration file.
 * 5. All other files in the entire repository remain subject to AIza detection without exception.
 */
export function isAllowedPublicClientCredential(relativePath, patternId, fileContent) {
  if (relativePath !== "firebase-applet-config.json") {
    return false;
  }

  if (patternId !== "google-api-key") {
    return false;
  }

  try {
    const parsed = JSON.parse(fileContent);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return false;
    }
    const keys = Object.keys(parsed);
    for (const key of keys) {
      if (!ALLOWED_FIREBASE_APPLET_KEYS.has(key)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Scans a single file's content against credential patterns and file-specific structure rules.
 */
export function scanFileContent(relativePath, content) {
  const failures = [];

  if (relativePath === "firebase-applet-config.json") {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        failures.push("firebase-applet-config.json must be a JSON object");
      } else {
        const keys = Object.keys(parsed);
        for (const key of keys) {
          if (!ALLOWED_FIREBASE_APPLET_KEYS.has(key)) {
            failures.push(`Unauthorized key in firebase-applet-config.json: ${key}`);
          }
        }
      }
    } catch {
      failures.push("firebase-applet-config.json is not valid JSON");
    }
  }

  for (const { id, pattern } of CREDENTIAL_PATTERNS) {
    if (pattern.test(content)) {
      if (isAllowedPublicClientCredential(relativePath, id, content)) {
        continue;
      }
      failures.push(`Credential-like literal in ${relativePath}`);
    }
  }

  return failures;
}

/**
 * Executes full security supply-chain validation across the repository.
 */
export function validateSecuritySupplyChain(rootDir = process.cwd()) {
  const failures = [];
  const fail = m => failures.push(m);
  const read = f => fs.readFileSync(f, "utf8");

  const contractPath = path.join(rootDir, "config", "security-supply-chain-contract.json");
  if (!fs.existsSync(contractPath)) throw new Error("Missing Phase 38C contract");
  const contract = JSON.parse(read(contractPath));
  if (contract.phase !== "38C") fail("security supply-chain contract phase must be 38C");
  if (contract.status !== "active") fail("security supply-chain contract must remain active");
  if (contract.scope !== "repository-source-and-github-actions") fail("security supply-chain scope drifted");
  if (typeof contract.controls !== "object" || contract.controls === null) fail("security supply-chain controls must be declared");

  function walk(dir) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if ([".git", "node_modules"].includes(e.name)) continue;
      const f = path.join(dir, e.name);
      e.isDirectory() ? out.push(...walk(f)) : out.push(f);
    }
    return out;
  }

  const files = walk(rootDir);
  const rel = f => path.relative(rootDir, f).replaceAll(path.sep, "/");

  for (const f of files) {
    const n = rel(f);
    if (RISKY_FILENAME_PATTERN.test(path.basename(n)) && n !== ".gitignore" && n !== ".env.example") {
      fail("Secret-like file: " + n);
    }
  }

  for (const f of files) {
    const n = rel(f);
    if (!SCANNED_EXTENSIONS.test(n) || EXCLUDED_PATHS.test(n)) continue;
    const c = read(f);
    const contentFailures = scanFileContent(n, c);
    failures.push(...contentFailures);
  }

  const gitignorePath = path.join(rootDir, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fail("Missing .gitignore");
  } else {
    const g = read(gitignorePath).split(/\r?\n/);
    for (const r of [".env*", ".dev.vars*", "node_modules/"]) {
      if (!g.includes(r)) fail("Missing .gitignore rule: " + r);
    }
  }

  const workflows = path.join(rootDir, ".github", "workflows");
  let workflowCount = 0;
  if (!fs.existsSync(workflows)) {
    fail("Missing .github/workflows directory");
  } else {
    const workflowFiles = fs.readdirSync(workflows).filter(f => /\.ya?ml$/i.test(f));
    workflowCount = workflowFiles.length;
    for (const file of workflowFiles) {
      const n = ".github/workflows/" + file;
      const c = read(path.join(workflows, file));
      if (/pull_request_target\s*:|workflow_run\s*:/m.test(c)) fail(n + ": elevated workflow trigger is not allowed");
      if (/\bsecrets\.[A-Za-z_][A-Za-z0-9_]*/.test(c)) fail(n + ": secret access is not allowed");
      if (!/^permissions:\s*\n\s+contents:\s+read\s*$/m.test(c)) fail(n + ": permissions must explicitly be contents: read");
      for (const m of c.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/gm)) {
        if (!/@[0-9a-f]{40}$/i.test(m[1])) fail(n + ": action not pinned to full SHA: " + m[1]);
      }
      const workflowLines = c.split(/\r?\n/);
      for (let i = 0; i < workflowLines.length; i++) {
        const match = workflowLines[i].match(/^([ \t]+)run:[ \t]*\|[ \t]*$/);
        if (!match) continue;
        const indent = match[1].length;
        const block = [];
        for (let j = i + 1; j < workflowLines.length; j++) {
          const line = workflowLines[j];
          if (line.trim() && line.match(/^[ \t]*/)[0].length <= indent) break;
          block.push(line);
        }
        const b = block.join("\n");
        if (/github\.event\.(?:pull_request|issue|comment|review)\.(?:title|body|head|ref)|github\.head_ref|github\.event\.inputs\./.test(b)) {
          fail(n + ": untrusted event data in shell");
        }
        if (/(?:curl|wget)\s+[^\n|]+\|\s*(?:bash|sh)\b|\beval\s+/.test(b)) {
          fail(n + ": remote shell execution pattern not allowed");
        }
      }
    }
  }

  const manifest = path.join(rootDir, "package.json");
  if (!fs.existsSync(manifest)) {
    fail("Missing package.json dependency manifest");
  } else {
    try {
      const p = JSON.parse(read(manifest));
      const buildScript = p.scripts?.build;
      if (!p.name || typeof buildScript !== "string" || !buildScript.includes("tsc") || !buildScript.includes("vite build") || !buildScript.includes("scripts/generate-sitemap.ts")) {
        fail("package.json build script must type-check, generate the sitemap, and run the Vite production build");
      }
    } catch {
      fail("package.json is not valid JSON");
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    checked: {
      workflows: workflowCount,
      files: files.length
    }
  };
}

// Direct CLI execution block
const isDirectExecution = Boolean(
  process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
);

if (isDirectExecution) {
  const result = validateSecuritySupplyChain(process.cwd());
  if (!result.ok) {
    console.error("Security / supply-chain validation FAILED");
    result.failures.forEach(x => console.error(" - " + x));
    process.exit(1);
  }
  console.log("Security / supply-chain validation PASSED");
  console.log("Workflows checked: " + result.checked.workflows);
  console.log("Secret-like filenames: checked (sample .env.example allowed and content-scanned)");
  console.log("Dependency manifest: package.json validated; lockfile policy requires separate review");
}
