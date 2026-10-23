import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const fail=[];
const rootIndex=read("index.html");
const app=read("src/App.tsx");
const entry=read("src/main.tsx");
const seo=read("src/components/SeoHead.tsx");
const routeSeo=read("src/components/RouteSeo.tsx");
const styles=read("src/index.css");
const sitemap=read("public/sitemap.xml");
const rootSitemap=read("sitemap.xml");
const robots=read("public/robots.txt");
const redirects=read("public/_redirects");
const headers=read("public/_headers");

function normalizePath(value){
  const path=value.split(/[?#]/,1)[0]||"/";
  if(path==="/")return "/";
  return path.replace(/\/+$/,"");
}
function routeMatches(pattern,path){
  if(pattern==="*")return false;
  const routeParts=normalizePath(pattern).split("/").filter(Boolean);
  const pathParts=normalizePath(path).split("/").filter(Boolean);
  let i=0;
  for(;i<routeParts.length;i++){
    const routePart=routeParts[i];
    if(routePart==="*")return true;
    if(i>=pathParts.length)return false;
    if(routePart.startsWith(":"))continue;
    if(routePart!==pathParts[i])return false;
  }
  return i===pathParts.length;
}

if(!rootIndex.includes('<div id="root"></div>'))fail.push("Vite entry HTML must include the React root element");
if(!rootIndex.includes('src="/src/main.tsx"')&&!rootIndex.includes('src="%BASE_URL%src/main.tsx"'))fail.push("Vite entry HTML must reference src/main.tsx using a supported Vite base path");
if(!rootIndex.includes('<link rel="canonical" href="https://jawed.co.in/"'))fail.push("root HTML canonical must use the production origin");
if(!entry.includes("BrowserRouter")||!entry.includes("ReactDOM.createRoot")||!entry.includes("./App"))fail.push("React entry must mount App inside BrowserRouter");
if(!app.includes('path="*"')||!app.includes("NotFoundPage"))fail.push("React Router must include an application not-found route");
if(!seo.includes("document.title")||!seo.includes('link[rel="canonical"]')||!seo.includes('meta[name="description"]')||!seo.includes('meta[name="robots"]'))fail.push("SeoHead must update title, canonical, description, and robots metadata");
if(!seo.includes('meta[property="og:url"]')||!seo.includes('meta[name="twitter:card"]'))fail.push("SeoHead must update social metadata");
if(!app.includes("<RouteSeo />")||!routeSeo.includes("resolveMetadata")||!routeSeo.includes("canonicalPath: '/field-guides/'"))fail.push("RouteSeo must be mounted and resolve route-specific metadata/canonical URLs");
if(!seo.includes("title.includes('Jawed Imtiaz')"))fail.push("SeoHead must avoid duplicate publisher suffixes when the title already contains the brand");
if(/\}\s*color:\s*var\(--text\);\s*border-radius:\s*8px;/.test(styles))fail.push("CSS contains the malformed duplicate declaration block previously seen in the production build");

const routePatterns=[...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(match=>match[1]);
if(!routePatterns.length)fail.push("React Router route declarations were not found");

const locations=[...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(match=>match[1].trim());
if(!sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'))fail.push("sitemap must use the standard sitemaps.org XML namespace");
if(rootSitemap!==sitemap)fail.push("root sitemap.xml and public/sitemap.xml must remain identical");
if(!sitemap.includes("<urlset")||!sitemap.includes("</urlset>"))fail.push("sitemap must contain a urlset envelope");
if(!locations.length)fail.push("sitemap must contain at least one URL");
if(new Set(locations).size!==locations.length)fail.push("sitemap must not contain duplicate URLs");

const seenPaths=new Set();
const redirectLines=new Set(redirects.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#")));
for(const location of locations){
  let url;
  try{url=new URL(location)}catch{fail.push("sitemap contains an invalid absolute URL: "+location);continue}
  if(url.protocol!=="https:"||url.origin!=="https://jawed.co.in")fail.push("sitemap URL must use canonical HTTPS origin: "+location);
  if(url.search||url.hash)fail.push("sitemap URL must not contain query strings or fragments: "+location);
  if(/\.html?$/i.test(url.pathname))fail.push("sitemap must not contain legacy .html URLs: "+location);
  const routePath=normalizePath(url.pathname);
  if(seenPaths.has(routePath))fail.push("sitemap contains duplicate normalized route: "+routePath);
  seenPaths.add(routePath);
  if(!routePatterns.some(pattern=>routeMatches(pattern,routePath)))fail.push("sitemap route is not represented by React Router: "+routePath);
  if(routePath!=="/"){
    const prefix="/"+routePath.split("/").filter(Boolean)[0];
    if(!redirectLines.has(prefix+" / 200")&&!redirectLines.has(prefix+"/* / 200"))fail.push("sitemap route lacks a Cloudflare Pages SPA rewrite: "+routePath);
  }
}
if(!robots.includes("User-agent: *")||!robots.includes("Allow: /"))fail.push("robots.txt must allow public crawling");
if(!robots.includes("Sitemap: https://jawed.co.in/sitemap.xml"))fail.push("robots.txt must declare the canonical sitemap");
if(robots.includes("Disallow: /\n"))fail.push("robots.txt must not disallow the entire site");
if(!headers.includes("X-Frame-Options: DENY")||!headers.includes("X-Content-Type-Options: nosniff")||!headers.includes("Content-Security-Policy:"))fail.push("public/_headers must retain the required security-header baseline");

const rootRedirects=read("_redirects").split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#"));
for(const line of rootRedirects)if(!redirectLines.has(line))fail.push("public/_redirects is missing a legacy redirect: "+line);
for(const line of redirects.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#"))){
  const parts=line.split(/\s+/);
  if(parts.length<3||!["200","301"].includes(parts.at(-1)))fail.push("redirect/rewrite has an invalid status or shape: "+line);
  if(parts.at(-1)==="200"&&parts[1]!=="/")fail.push("SPA rewrite must target / to avoid the /index.html legacy redirect loop: "+line);
}

for(const path of ["src/data/aiKnowledge.json","src/data/blogData.json","src/data/blogRaw.json","src/data/notesData.json","src/data/notesRaw.json"]){
  try{JSON.parse(read(path))}catch{fail.push("content data is not valid JSON: "+path)}
}
const ai=read("src/services/aiKnowledgeEngine.ts");
if(!ai.includes("export async function askJawedAi")||!ai.includes("isPersonalQuery")||!ai.includes("searchKnowledge"))fail.push("client-side AI knowledge and privacy guardrails must be present");
if(ai.includes("fetch('/api/ai'")||ai.includes('fetch("/api/ai"'))fail.push("client-side AI contract must not silently depend on an undeployed /api/ai endpoint");

if(fail.length){
  console.error("Site Integrity Gate FAILED");
  for(const item of fail)console.error("- "+item);
  process.exit(1);
}
console.log("Site Integrity Gate PASSED");
console.log("React Router routes matched against "+locations.length+" canonical sitemap URLs");
console.log("Vite entry, SEO metadata component, sitemap, robots, Cloudflare headers/redirects, content JSON, and AI privacy boundaries validated");
