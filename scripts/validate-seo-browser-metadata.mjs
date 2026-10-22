#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let driver = null;
let sessionId = null;

async function request(method, path, body) {
  const response = await fetch("http://127.0.0.1:9515" + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; }
  catch { throw new Error("ChromeDriver returned non-JSON"); }
  if (!response.ok || payload.value?.error) {
    throw new Error(method + " " + path + ": " + JSON.stringify(payload).slice(0, 500));
  }
  return payload.value;
}
async function command(method, path, body) {
  return request(method, "/session/" + sessionId + path, body);
}
async function js(script, args = []) {
  return command("POST", "/execute/sync", { script, args });
}
async function waitForTitle(expected, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const title = await js("return document.title");
    if (title === expected) return;
    await sleep(100);
  }
  throw new Error("Timed out waiting for title: " + expected);
}
async function metadata(selector) {
  return js("return document.querySelector(arguments[0])?.getAttribute('content') ?? null", [selector]);
}
async function canonical() {
  return js("return document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? null");
}

const cases = [
  {
    path: "/",
    title: "Jawed Imtiaz | IT Field Tech, Troubleshooting Guides & Practical Tools",
    description: "Practical IT field guides, IPv4 subnet calculators, server rack power calculators, and interactive IT service desk diagnostic utilities by Jawed Imtiaz.",
    canonical: "https://jawed.co.in/",
    robots: "index, follow",
  },
  {
    path: "/about/",
    title: "About Jawed Imtiaz",
    description: "Learn about Jawed Imtiaz's IT support experience, workplace technology background, certifications, and practical technical interests.",
    canonical: "https://jawed.co.in/about/",
    robots: "index, follow",
  },
  {
    path: "/notes/ai-for-it-support-practical-workflow",
    title: "AI for IT Support: A Practical Starting Workflow | Jawed Imtiaz",
    description: "A practical, low-risk workflow for using AI to assist IT support work without replacing troubleshooting judgment or exposing sensitive data.",
    canonical: "https://jawed.co.in/notes/ai-for-it-support-practical-workflow",
    robots: "index, follow",
  },
  {
    path: "/tools/career-match-resume-review",
    title: "Career Match & Resume Review | Jawed Imtiaz",
    description: "Compare resume experience with a job description and identify relevant skills, gaps, and improvements.",
    canonical: "https://jawed.co.in/tools/career-match-resume-review",
    robots: "index, follow",
  },
  {
    path: "/field-guides/rj45-cabling-t568a-vs-t568b-guide",
    title: "Comprehensive Guide to RJ45 Cabling: T568A vs T568B Standards, Pinouts, and Field Verification | Jawed Imtiaz",
    description: "Master RJ45 color coding standards, T568A vs T568B pinout tables, crimping best practices, and wiremap diagnostic readings for field technicians.",
    canonical: "https://jawed.co.in/field-guides/rj45-cabling-t568a-vs-t568b-guide",
    robots: "index, follow",
  },
  {
    path: "/blog/rebuilding-jawed-co-in",
    title: "Rebuilding Jawed.co.in | Jawed Imtiaz",
    description: "A look at the rebuild of Jawed.co.in from a legacy personal website into a modern, mobile-first site for work, notes, blog, tools and resources.",
    canonical: "https://jawed.co.in/blog/rebuilding-jawed-co-in",
    robots: "index, follow",
  },
  {
    path: "/tools/",
    title: "IT Tools & Calculators | Jawed Imtiaz",
    description: "Explore browser-based IT, career, and personal-finance calculators and practical utilities built by Jawed Imtiaz.",
    canonical: "https://jawed.co.in/tools/",
    robots: "index, follow",
  },
  {
    path: "/privacy/",
    title: "Website Privacy and Data Handling | Jawed Imtiaz",
    description: "How jawed.co.in handles contact messages, browser-based tools, local storage, third-party services, and privacy choices.",
    canonical: "https://jawed.co.in/privacy/",
    robots: "index, follow",
  },
  {
    path: "/services/",
    title: "Services & IT Field Dispatch | Jawed Imtiaz",
    description: "Information about IT field support, workplace technology, and service dispatch resources.",
    canonical: "https://jawed.co.in/services-dispatch/",
    robots: "index, follow",
  },
  {
    path: "/ai/",
    title: "Jawed AI Assistant | Jawed Imtiaz",
    description: "Ask questions about published technical guides, IT troubleshooting methods, and tools on Jawed.co.in.",
    canonical: "https://jawed.co.in/ai/",
    robots: "noindex, follow",
  },
  {
    path: "/guides/ai-for-it-support-practical-workflow",
    title: "AI for IT Support: A Practical Starting Workflow | Jawed Imtiaz",
    description: "A practical, low-risk workflow for using AI to assist IT support work without replacing troubleshooting judgment or exposing sensitive data.",
    canonical: "https://jawed.co.in/notes/ai-for-it-support-practical-workflow",
    robots: "index, follow",
  },
  {
    path: "/blog/slug-that-does-not-exist-seo-test",
    title: "Blog | Jawed Imtiaz",
    description: "Updates and reflections on rebuilding Jawed.co.in, IT work, tools, and practical technology projects.",
    canonical: "https://jawed.co.in/blog/",
    robots: "index, follow",
  },
  {
    path: "/unknown-seo-test-route",
    title: "Page Not Found | Jawed Imtiaz",
    description: "The requested page could not be found on jawed.co.in.",
    canonical: "https://jawed.co.in/404",
    robots: "noindex, follow",
  },
  {
    path: "/notes/slug-that-does-not-exist-seo-test",
    title: "Field Guides & Knowledge Base | Jawed Imtiaz",
    description: "Practical IT troubleshooting guides, knowledge-base articles, and step-by-step technical references from Jawed Imtiaz.",
    canonical: "https://jawed.co.in/field-guides/",
    robots: "index, follow",
  },
];

try {
  driver = spawn(process.env.CHROMEDRIVER || "chromedriver", ["--port=9515"], { stdio: "ignore" });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch("http://127.0.0.1:9515/status");
      ready = true;
      break;
    } catch {}
    await sleep(100);
  }
  assert.equal(ready, true, "ChromeDriver did not start");

  const capabilities = {
    capabilities: {
      alwaysMatch: {
        browserName: "chrome",
        pageLoadStrategy: "normal",
        "goog:chromeOptions": {
          args: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--window-size=1280,900"],
        },
      },
    },
  };
  const session = await request("POST", "/session", capabilities);
  sessionId = session.sessionId || session.value?.sessionId;
  assert.ok(sessionId, "ChromeDriver session was not created");

  for (const item of cases) {
    await command("POST", "/url", { url: BASE_URL + item.path });
    await waitForTitle(item.title);
    assert.equal(await metadata('meta[name="description"]'), item.description, item.path + " description");
    assert.equal(await canonical(), item.canonical, item.path + " canonical");
    assert.equal(await metadata('meta[name="robots"]'), item.robots, item.path + " robots");
    assert.equal(await metadata('meta[property="og:url"]'), item.canonical, item.path + " og:url");
    assert.equal(await metadata('meta[property="og:title"]'), item.title, item.path + " og:title");
    console.log("PASS " + item.path + " — title, description, canonical, robots, og:url, og:title");
  }
  console.log("SEO browser metadata validation: PASS (" + cases.length + " routes)");
} catch (error) {
  console.error("SEO browser metadata validation: FAIL");
  console.error(error?.stack || String(error));
  process.exitCode = 1;
} finally {
  if (sessionId) {
    try { await request("DELETE", "/session/" + sessionId); } catch {}
  }
  if (driver && !driver.killed) driver.kill("SIGTERM");
}
