import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const isHttpsOrigin = (value) => {
  try {
    const url = new URL(value);
    return (
      typeof value === "string" &&
      url.protocol === "https:" &&
      url.origin === value &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
};

export const hasUnsafeDotSegments = (value) =>
  value.split("/").some((segment) => {
    const normalized = segment.toLowerCase();
    return (
      segment === "." ||
      segment === ".." ||
      normalized === "%2e" ||
      normalized === "%2e%2e"
    );
  });

export function validateContract(contract) {
  const failures = [];
  if (!isHttpsOrigin(contract.production_origin)) {
    failures.push("production 404 origin must be an origin-only HTTPS URL");
  }
  if (
    typeof contract.path !== "string" ||
    !contract.path.startsWith("/") ||
    contract.path.startsWith("//") ||
    contract.path.includes("\\") ||
    hasUnsafeDotSegments(contract.path)
  ) {
    failures.push("404 path must be absolute");
  }
  if (
    !Number.isInteger(contract.expected_status) ||
    contract.expected_status < 100 ||
    contract.expected_status > 599
  ) {
    failures.push("404 expected_status must be valid");
  }
  if (
    !Array.isArray(contract.required_markers) ||
    contract.required_markers.length < 1
  ) {
    failures.push("404 required_markers must be non-empty");
  }
  if (contract.max_redirects !== 0) {
    failures.push("production checks must not follow redirects");
  }
  if (
    !Number.isInteger(contract.max_body_bytes) ||
    contract.max_body_bytes <= 0
  ) {
    failures.push("production max_body_bytes must be a positive integer");
  }
  return failures;
}

export async function readBoundedText(response, maxBytes) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isInteger(declared) && declared > maxBytes) {
    throw new Error("response exceeds declared body limit");
  }
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) {
      throw new Error("response exceeds body limit");
    }
    return text;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("response exceeds body limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(
    Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
  );
}

export function evaluate404Response(response, body, contract) {
  const failures = [];
  const type = (response.headers.get("content-type") || "").toLowerCase();

  if (response.status !== contract.expected_status) {
    failures.push(
      `404 probe: expected HTTP ${contract.expected_status}, got ${response.status}`
    );
  }
  if (!type.startsWith("text/html")) {
    failures.push(`404 probe: expected text/html, got ${type || "missing"}`);
  }
  if (response.status >= 300 && response.status < 400) {
    failures.push("404 probe: unexpected redirect");
  }
  for (const marker of contract.required_markers || []) {
    if (!body.includes(marker)) {
      failures.push(`404 probe: missing marker ${marker}`);
    }
  }
  for (const marker of contract.forbidden_markers || []) {
    const markerIndex = body.toLowerCase().indexOf(marker.toLowerCase());
    if (markerIndex !== -1) {
      const start = Math.max(0, markerIndex - 100);
      const end = Math.min(body.length, markerIndex + marker.length + 100);
      const context = body.slice(start, end).replace(/\s+/g, " ");
      console.error(
        `404 diagnostic: forbidden marker=${JSON.stringify(marker)} index=${markerIndex} context=${JSON.stringify(context)}`
      );
      failures.push(`404 probe: platform/error marker detected ${marker}`);
    }
  }
  if (body.length < 500) {
    failures.push("404 probe: response body is unexpectedly small");
  }

  return failures;
}

export async function runProduction404Validation(
  contractPath = "config/production-404-contract.json",
  options = {}
) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 10000;
  const contract =
    options.contract ||
    JSON.parse(fs.readFileSync(contractPath, "utf8"));

  const failures = validateContract(contract);

  const validPath =
    typeof contract.path === "string" &&
    contract.path.startsWith("/") &&
    !contract.path.startsWith("//") &&
    !contract.path.includes("\\") &&
    !hasUnsafeDotSegments(contract.path);
  const validOrigin = isHttpsOrigin(contract.production_origin);
  const url =
    validPath && validOrigin
      ? new URL(contract.path, contract.production_origin)
      : null;

  if (!url) {
    failures.push("404 probe skipped: contract URL is invalid");
    return { ok: false, failures, url: null, contract };
  }

  if (failures.length > 0) {
    return { ok: false, failures, url: url.toString(), contract };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        accept: "text/html",
        "user-agent": "jawed-production-404/39I"
      }
    });
    const body = await readBoundedText(response, contract.max_body_bytes);
    const probeFailures = evaluate404Response(response, body, contract);
    failures.push(...probeFailures);
  } catch (error) {
    failures.push(
      `404 probe: ${
        error?.name === "AbortError"
          ? "request timed out"
          : error?.message || "request failed"
      }`
    );
  } finally {
    clearTimeout(timer);
  }

  return {
    ok: failures.length === 0,
    failures,
    url: url.toString(),
    contract
  };
}

// CLI direct execution
const isDirectExecution = Boolean(
  process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
);

if (isDirectExecution) {
  const result = await runProduction404Validation();
  if (result.failures.length) {
    console.error("Production 404 Reliability Gate FAILED");
    for (const failure of result.failures) {
      console.error("- " + failure);
    }
    process.exit(1);
  }
  console.log("Production 404 Reliability Gate PASSED");
  console.log(`Probe: ${result.url}`);
}
