import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  evaluate404Response,
  validateContract,
  runProduction404Validation,
  isHttpsOrigin,
  hasUnsafeDotSegments
} from "../scripts/validate-production-404.mjs";

const CONTRACT_PATH = "config/production-404-contract.json";
const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8"));

// Sample valid custom 404 HTML body with required markers and length > 500 bytes
const createValidCustom404Html = (extra = "") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>404 · Route Not Found | Jawed Imtiaz</title>
</head>
<body>
  <main>
    <h1>404 · Route Not Found</h1>
    <p>The requested page could not be located on this server.</p>
    <h2>Looking for Technical Resources?</h2>
    <p>Explore tools, notes, and technical references available across the site.</p>
    <p>Check out our interactive utilities: <a href="/tools">Technical Tools Directory</a></p>
  </main>
  <footer>
    <p>Copyright &copy; Jawed Imtiaz. All rights reserved. Professional IT support and technical notes.</p>
  </footer>
  ${extra}
</body>
</html>
`;

test("Production 404 Contract: schema and invariant checks", () => {
  const failures = validateContract(contract);
  assert.equal(failures.length, 0, "Canonical contract must have 0 schema failures");
  assert.equal(contract.production_origin, "https://jawed.co.in");
  assert.equal(contract.path, "/missing-phase-39i-404-test");
  assert.equal(contract.expected_status, 404);
  assert.equal(contract.max_redirects, 0);
  assert.ok(contract.max_body_bytes > 0);

  // Overly broad 'cloudflare' marker must NOT be in forbidden_markers
  assert.ok(
    !contract.forbidden_markers.includes("cloudflare"),
    "Generic 'cloudflare' must be removed from forbidden_markers"
  );

  // Specific Cloudflare platform error indicators must be present
  assert.ok(contract.forbidden_markers.includes("cf-error"), "Must include cf-error");
  assert.ok(contract.forbidden_markers.includes("cf-wrapper"), "Must include cf-wrapper");
  assert.ok(contract.forbidden_markers.includes("cf-error-details"), "Must include cf-error-details");
  assert.ok(contract.forbidden_markers.includes("cf-error-code"), "Must include cf-error-code");
  assert.ok(contract.forbidden_markers.includes("<title>404 Not Found</title>"), "Must include default 404 title");
});

test("Requirement 1: A legitimate Cloudflare analytics beacon does not fail validation", () => {
  const analyticsScript = `
    <!-- Cloudflare Web Analytics -->
    <script defer src='https://static.cloudflareinsights.com/beacon.min.js/vcd15cbe7772f49c399c6a5babf22c1241717689176015'
      data-cf-beacon='{"token": "abcdef123456"}'></script>
    <!-- End Cloudflare Web Analytics -->
  `;
  const body = createValidCustom404Html(analyticsScript);
  const response = new Response(body, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" }
  });

  const failures = evaluate404Response(response, body, contract);
  assert.equal(
    failures.length,
    0,
    `Legitimate Cloudflare analytics beacon must pass validation without error. Got: ${failures.join(", ")}`
  );
});

test("Requirement 2: Genuine platform/error markers still fail validation", () => {
  const cases = [
    {
      name: "Default server 404 title",
      snippet: "<title>404 Not Found</title>",
      expectedMarker: "<title>404 Not Found</title>"
    },
    {
      name: "Cloudflare cf-error element",
      snippet: '<div class="cf-error-overview">Cloudflare error</div>',
      expectedMarker: "cf-error"
    },
    {
      name: "Cloudflare wrapper container",
      snippet: '<div id="cf-wrapper">Cloudflare edge container</div>',
      expectedMarker: "cf-wrapper"
    },
    {
      name: "Cloudflare error details block",
      snippet: '<div class="cf-error-details">Error 1000: DNS points to prohibited IP</div>',
      expectedMarker: "cf-error-details"
    },
    {
      name: "Cloudflare error code element",
      snippet: '<span class="cf-error-code">1016</span>',
      expectedMarker: "cf-error-code"
    }
  ];

  for (const { name, snippet, expectedMarker } of cases) {
    const body = createValidCustom404Html(snippet);
    const response = new Response(body, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" }
    });

    const failures = evaluate404Response(response, body, contract);
    assert.ok(
      failures.length > 0,
      `Case '${name}' must fail validation`
    );
    assert.ok(
      failures.some((f) => f.includes(`platform/error marker detected ${expectedMarker}`)),
      `Case '${name}' must detect marker '${expectedMarker}'. Got: ${failures.join(", ")}`
    );
  }
});

test("Requirement 3: A valid custom 404 response passes cleanly", () => {
  const body = createValidCustom404Html();
  const response = new Response(body, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" }
  });

  const failures = evaluate404Response(response, body, contract);
  assert.equal(failures.length, 0, "Valid custom 404 response must pass with 0 failures");
});

test("Requirement 4: An incorrect HTTP status fails validation", () => {
  const body = createValidCustom404Html();

  // Test HTTP 200
  const res200 = new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
  const failures200 = evaluate404Response(res200, body, contract);
  assert.ok(
    failures200.some((f) => f.includes("expected HTTP 404, got 200")),
    "HTTP 200 must fail expected status check"
  );

  // Test HTTP 500
  const res500 = new Response(body, {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
  const failures500 = evaluate404Response(res500, body, contract);
  assert.ok(
    failures500.some((f) => f.includes("expected HTTP 404, got 500")),
    "HTTP 500 must fail expected status check"
  );

  // Test HTTP 301 redirect
  const res301 = new Response(body, {
    status: 301,
    headers: { "content-type": "text/html; charset=utf-8", location: "/" }
  });
  const failures301 = evaluate404Response(res301, body, contract);
  assert.ok(
    failures301.some((f) => f.includes("expected HTTP 404, got 301")),
    "HTTP 301 must fail expected status check"
  );
  assert.ok(
    failures301.some((f) => f.includes("unexpected redirect")),
    "HTTP 301 must trigger unexpected redirect failure"
  );
});

test("Requirement 5: Required markers missing from the response fail validation", () => {
  const requiredMarkers = [
    "404 · Route Not Found",
    "Looking for Technical Resources?",
    'href="/tools"'
  ];

  for (const missingMarker of requiredMarkers) {
    // Generate valid HTML without the target marker
    let body = createValidCustom404Html();
    body = body.replaceAll(missingMarker, "REPLACED_MARKER");

    const response = new Response(body, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" }
    });

    const failures = evaluate404Response(response, body, contract);
    assert.ok(
      failures.some((f) => f.includes(`missing marker ${missingMarker}`)),
      `Must fail when missing '${missingMarker}'. Got: ${failures.join(", ")}`
    );
  }
});

test("Requirement 6: Non-HTML content-type and small body protections", () => {
  const body = createValidCustom404Html();

  // Non-HTML content-type
  const jsonResponse = new Response(body, {
    status: 404,
    headers: { "content-type": "application/json" }
  });
  const jsonFailures = evaluate404Response(jsonResponse, body, contract);
  assert.ok(
    jsonFailures.some((f) => f.includes("expected text/html")),
    "Must fail when content-type is not text/html"
  );

  // Body unexpectedly small (< 500 bytes)
  const tinyBody = "<h1>404 · Route Not Found</h1>Looking for Technical Resources?<a href=\"/tools\">Tools</a>";
  const tinyResponse = new Response(tinyBody, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
  const tinyFailures = evaluate404Response(tinyResponse, tinyBody, contract);
  assert.ok(
    tinyFailures.some((f) => f.includes("response body is unexpectedly small")),
    "Must fail when response body is under 500 bytes"
  );
});

test("Requirement 7: Contract URL and dot segment validation helpers", () => {
  assert.ok(isHttpsOrigin("https://jawed.co.in"));
  assert.ok(!isHttpsOrigin("http://jawed.co.in"));
  assert.ok(!isHttpsOrigin("https://jawed.co.in/path"));
  assert.ok(!isHttpsOrigin("https://user:pass@jawed.co.in"));

  assert.ok(!hasUnsafeDotSegments("/missing-404-test"));
  assert.ok(hasUnsafeDotSegments("/../etc/passwd"));
  assert.ok(hasUnsafeDotSegments("/%2e%2e/test"));
  assert.ok(hasUnsafeDotSegments("/%2e/test"));
  assert.ok(hasUnsafeDotSegments("/test/./sub"));
});

test("Requirement 8: runProduction404Validation with mock fetch", async () => {
  // Successful probe mock
  const mockValidFetch = async () =>
    new Response(createValidCustom404Html('<script src="https://static.cloudflareinsights.com/beacon.min.js"></script>'), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" }
    });

  const passResult = await runProduction404Validation(CONTRACT_PATH, {
    fetchImpl: mockValidFetch
  });
  assert.ok(passResult.ok, "Mock probe must pass");
  assert.equal(passResult.failures.length, 0);

  // Failing probe mock (HTTP 500)
  const mockFailFetch = async () =>
    new Response("Internal Server Error", {
      status: 500,
      headers: { "content-type": "text/plain" }
    });

  const failResult = await runProduction404Validation(CONTRACT_PATH, {
    fetchImpl: mockFailFetch
  });
  assert.ok(!failResult.ok, "Mock 500 probe must fail");
  assert.ok(failResult.failures.length > 0);
});
