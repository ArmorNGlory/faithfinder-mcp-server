#!/usr/bin/env node
/**
 * Submit new / changed FaithFinder pages to IndexNow (Bing, Yandex, Naver, Seznam, …).
 * Bing's index powers ChatGPT Search and Microsoft Copilot.
 *
 * Usage (AFTER the web app with the latest web-kit has been deployed):
 *   npm run indexnow            # submit only new/changed pages since last run
 *   npm run indexnow -- --all   # resubmit every page
 *   npm run indexnow -- --dry-run
 *
 * State of what was submitted is kept in indexnow-state.json (content hashes per URL),
 * so unchanged pages are never re-pinged.
 *
 * Follows the global safe-fetching standard: HTTPS only, pre-flight URL validation,
 * 5s timeouts, text/JSON content-type checks, no redirects followed.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, resolve, relative, sep } from "path";
import { createHash } from "crypto";
import { isSafeAndSecureUrl } from "../dist/security.js";
import { SITE_URL } from "../dist/links.js";

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const ALL = args.has("--all");
const KIT = resolve("web-kit");
const STATE_PATH = resolve("indexnow-state.json");
const KEY = readFileSync(resolve("indexnow-key.txt"), "utf-8").trim();
const HOST = new URL(SITE_URL).host;
const KEY_LOCATION = `${SITE_URL}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH = 10_000; // IndexNow max URLs per request

if (!existsSync(join(KIT, "sitemap.xml"))) {
  console.error("web-kit not found — run `npm run build:web` first.");
  process.exit(1);
}

async function safeFetch(url, init = {}, attempt = 1) {
  const safe = isSafeAndSecureUrl(url);
  if (!safe) throw new Error(`Blocked unsafe URL: ${url}`);
  let res;
  try {
    res = await fetch(safe, { ...init, redirect: "manual", signal: AbortSignal.timeout(5000) });
  } catch (err) {
    if (attempt < 2 && err?.name === "TimeoutError") return safeFetch(url, init, attempt + 1);
    throw err;
  }
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct && !/^(text\/|application\/json)/.test(ct)) throw new Error(`Unexpected content-type ${ct} from ${url}`);
  return res;
}

// 1. Collect every page in the kit with a content hash (ignoring the daily "Updated YYYY-MM-DD" stamp).
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === "index.html" || name === "llms.txt" || name === "llms-full.txt") out.push(p);
  }
  return out;
}

const pages = walk(KIT).map((file) => {
  const rel = relative(KIT, file).split(sep).join("/");
  const path = rel.endsWith("index.html") ? "/" + rel.slice(0, -"index.html".length) : "/" + rel;
  const body = readFileSync(file, "utf-8").replace(/Updated \d{4}-\d{2}-\d{2}|Generated \d{4}-\d{2}-\d{2}/g, "");
  return { url: `${SITE_URL}${path}`, hash: createHash("sha1").update(body).digest("hex").slice(0, 16) };
});

const state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, "utf-8")) : { submitted: {} };
const changed = pages.filter((p) => ALL || state.submitted[p.url] !== p.hash);
const removed = Object.keys(state.submitted).filter((u) => !pages.some((p) => p.url === u));
const toSubmit = [...changed.map((p) => p.url), ...removed]; // removed pages: IndexNow lets search engines see the 404

console.log(`[indexnow] ${pages.length} pages in kit · ${changed.length} new/changed · ${removed.length} removed`);
if (!toSubmit.length) {
  console.log("[indexnow] Nothing to submit.");
  process.exit(0);
}

// 2. Make sure the key file is live on the site (otherwise IndexNow rejects the submission).
const keyRes = await safeFetch(KEY_LOCATION);
const keyBody = (await keyRes.text()).trim();
if (keyRes.status !== 200 || keyBody !== KEY) {
  console.error(`[indexnow] Key file not live at ${KEY_LOCATION} (status ${keyRes.status}). Deploy the web app first.`);
  process.exit(1);
}
console.log(`[indexnow] Key verified at ${KEY_LOCATION}`);

if (DRY) {
  console.log(`[indexnow] Dry run — would submit ${toSubmit.length} URLs, e.g.\n  ${toSubmit.slice(0, 5).join("\n  ")}`);
  process.exit(0);
}

// 3. Submit in batches.
let ok = 0;
for (let i = 0; i < toSubmit.length; i += BATCH) {
  const urlList = toSubmit.slice(i, i + BATCH).filter((u) => isSafeAndSecureUrl(u));
  const res = await safeFetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });
  const text = (await res.text()).slice(0, 300);
  // 200 = OK, 202 = accepted (key validation pending). 4xx = problem.
  console.log(`[indexnow] batch ${i / BATCH + 1}: ${urlList.length} URLs -> HTTP ${res.status}${text ? ` ${text}` : ""}`);
  if (res.status === 200 || res.status === 202) {
    ok += urlList.length;
  } else {
    console.error("[indexnow] Submission rejected; state not updated for this batch.");
    process.exitCode = 1;
    break;
  }
}

// 4. Record what was submitted.
if (ok) {
  for (const p of changed) state.submitted[p.url] = p.hash;
  for (const u of removed) delete state.submitted[u];
  state.lastSubmittedAt = new Date().toISOString();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 0) + "\n");
  console.log(`[indexnow] Submitted ${ok} URLs. State saved to indexnow-state.json`);
}
