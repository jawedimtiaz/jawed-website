import fs from "node:fs";

const fail = [];
const read = (path) => {
  if (!fs.existsSync(path)) {
    fail.push(`Missing required file: ${path}`);
    return null;
  }
  return fs.readFileSync(path, "utf8");
};
const parse = (path) => {
  const text = read(path);
  if (text === null) return null;
  try { return JSON.parse(text); }
  catch { fail.push(`Invalid JSON: ${path}`); return null; }
};

const twa = parse("android/twa-manifest.json");
const web = parse("manifest.json");

if (twa) {
  if (twa.packageId !== "in.co.jawed.website") fail.push("Unexpected TWA packageId");
  if (twa.host !== "www.jawed.co.in") fail.push("Unexpected TWA host");
  if (twa.startUrl !== "/") fail.push("TWA startUrl must be /");
  if (twa.display !== "standalone") fail.push("TWA display must be standalone");
  if (!Number.isInteger(twa.appVersionCode) || twa.appVersionCode < 1) fail.push("TWA appVersionCode must be a positive integer");
  const origin = `https://${twa.host}`;
  if (twa.webManifestUrl !== `${origin}/manifest.json`) fail.push("TWA webManifestUrl must match the configured HTTPS host");
  if (twa.fullScopeUrl !== `${origin}/`) fail.push("TWA fullScopeUrl must match the configured HTTPS host root");
  for (const key of ["iconUrl", "maskableIconUrl", "monochromeIconUrl"]) {
    if (typeof twa[key] !== "string" || !twa[key].startsWith(`${origin}/assets/icons/`)) fail.push(`TWA ${key} must use a site-hosted icon`);
  }
  if (!Array.isArray(twa.fingerprints)) fail.push("TWA fingerprints must be an array");
  if (Array.isArray(twa.fingerprints) && twa.fingerprints.length === 0) {
    console.log("Signing certificate not configured yet; Digital Asset Links remains gated.");
  }
  if (typeof twa.signingKey?.path !== "string" || !twa.signingKey.path.startsWith("./")) fail.push("TWA signing-key path must be repository-relative");
  if (twa.signingKey?.path?.includes("..")) fail.push("Unsafe signing-key path");
  if (twa.serviceAccountJsonFile) fail.push("Do not configure a service-account credential file in the repository manifest");
}
if (web) {
  if (web.start_url !== "/") fail.push("Web manifest start_url must be /");
  if (web.scope !== "/") fail.push("Web manifest scope must be /");
  if (web.display !== "standalone") fail.push("Web manifest display must be standalone");
  for (const size of ["192x192", "512x512"]) {
    if (!web.icons?.some(icon => icon.sizes === size)) fail.push(`Web manifest missing ${size} icon`);
  }
}
for (const iconPath of ["assets/icons/pwa-192.svg", "assets/icons/pwa-512.svg"]) {
  const icon = read(iconPath);
  if (icon !== null && !/<svg\b/i.test(icon)) fail.push(`PWA icon is not SVG markup: ${iconPath}`);
}

if (fail.length) {
  console.error("TWA configuration validation FAILED");
  for (const message of fail) console.error(` - ${message}`);
  process.exit(1);
}
console.log("TWA configuration contract: PASS");
