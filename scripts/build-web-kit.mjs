#!/usr/bin/env node
/**
 * Build the FaithFinder "web kit": static, crawlable SEO/GEO assets generated
 * from data/churches.json, for AI answer engines (ChatGPT Search, Perplexity,
 * Gemini / Google AI Overviews, Claude, Copilot) and classic search engines.
 *
 * Output (default ./web-kit, override with --out <dir>):
 *   llms.txt, llms-full.txt, robots.txt, sitemap.xml, ff-directory.css
 *   us/index.html                          national directory
 *   us/{st}/index.html                     state directory
 *   us/{st}/{city}/index.html              city directory
 *   church/{st}/{city}/{slug}/index.html   church profile
 *
 * These paths must not collide with the web app's SPA / build_static_seo routes.
 * Run: npm run build:web   (then copy the folder into the web app's dist/ before deploying)
 */

import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "fs";
import { join, resolve } from "path";
import { loadChurches, US_STATES, slugify, readPackageVersion } from "../dist/data.js";
import { ChurchIndex } from "../dist/search.js";
import { SITE_URL, canonical, churchPath, cityPath, statePath, PERSONA_PAGES, CURATED_CITY_HUBS, REPO_URL, NPM_URL } from "../dist/links.js";
import { isSafeAndSecureUrl } from "../dist/security.js";

const args = process.argv.slice(2);
const outArg = args.indexOf("--out");
const OUT = resolve(outArg >= 0 ? args[outArg + 1] : "web-kit");
const MCP_REMOTE_URL = process.env.MCP_REMOTE_URL || ""; // e.g. https://mcp.faithfinder.armornglory.com/mcp
const TODAY = new Date().toISOString().slice(0, 10);
const VERSION = readPackageVersion();

const index = new ChurchIndex(loadChurches());
const churches = index.churches.filter((c) => c.stateCode && c.cityKey);
const total = churches.length;
const totalLabel = `${(Math.floor(total / 100) * 100).toLocaleString("en-US")}+`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safe = (u) => (u ? isSafeAndSecureUrl(u) : null);
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const plural = (n, w, p = w + "s") => `${n.toLocaleString("en-US")} ${n === 1 ? w : p}`;
let written = 0;

function write(relPath, content) {
  const full = join(OUT, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
  written++;
}

function countBy(list, fn) {
  const m = new Map();
  for (const x of list) for (const k of [].concat(fn(x) || [])) if (k) m.set(k, (m.get(k) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const byQuality = (a, b) => b.qualityScore - a.qualityScore;
const hasKids = (c) => (c.tags || []).some((t) => /kid|child|family|nursery/i.test(t));

// Group churches: state -> cityKey -> churches
const tree = new Map();
for (const c of churches) {
  const st = tree.get(c.stateCode) ?? new Map();
  const list = st.get(c.cityKey) ?? [];
  list.push(c);
  st.set(c.cityKey, list);
  tree.set(c.stateCode, st);
}
for (const st of tree.values()) for (const list of st.values()) list.sort(byQuality);
const cityLabel = (list) => list[0].city;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const CSS = `
:root{--ink:#1d1b26;--muted:#5d5a6b;--line:#e6e3ee;--bg:#faf9fc;--card:#fff;--brand:#5b3fd1;--brand-ink:#fff;--gold:#b8860b}
*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg)}
a{color:var(--brand)}header,main,footer{max-width:960px;margin:0 auto;padding:0 20px}
header{display:flex;justify-content:space-between;align-items:center;padding-top:18px;padding-bottom:18px;border-bottom:1px solid var(--line)}
header .logo{font-weight:800;text-decoration:none;color:var(--ink);font-size:20px}header nav a{margin-left:16px;font-size:15px}
nav.crumbs{font-size:14px;color:var(--muted);margin:18px 0 0}nav.crumbs a{color:var(--muted)}
h1{font-size:32px;line-height:1.2;margin:14px 0 8px}h2{font-size:22px;margin:32px 0 12px}
.lede{color:var(--muted);font-size:18px;margin:0 0 16px}
.cta{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:var(--brand);color:var(--brand-ink);border-radius:14px;padding:18px 22px;margin:24px 0}
.cta a{background:#fff;color:var(--brand);padding:10px 16px;border-radius:10px;font-weight:700;text-decoration:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;padding:0;list-style:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
.card h3{font-size:17px;margin:0 0 4px}.card h3 a{text-decoration:none;color:var(--ink)}
.meta{color:var(--muted);font-size:14px;margin:0}.tags{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}
.tags li{font-size:12px;background:#f1eefb;color:#3e2b98;border-radius:999px;padding:2px 9px}
.rating{color:var(--gold);font-size:14px}.links a{margin-right:12px;font-size:14px}
dl.facts{display:grid;grid-template-columns:max-content 1fr;gap:6px 18px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 20px}
dl.facts dt{color:var(--muted)}dl.facts dd{margin:0}
ul.cols{columns:3 200px;padding-left:18px}ul.cols li{margin-bottom:4px}
.faq dt{font-weight:700;margin-top:14px}.faq dd{margin:4px 0 0}
footer{border-top:1px solid var(--line);margin-top:48px;padding-top:20px;padding-bottom:40px;color:var(--muted);font-size:14px}
`;

function page({ path, title, description, h1, lede, crumbs = [], body, schema = [] }) {
  const url = canonical(path);
  const breadcrumb = crumbs.length
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: canonical(c.path) })),
      }
    : null;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Faith Finder">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${canonical("/Armor&GloryBanner.png")}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="text/plain" href="${canonical("/llms.txt")}" title="llms.txt">
<link rel="stylesheet" href="/ff-directory.css">
${[breadcrumb, ...schema].filter(Boolean).map(jsonLd).join("\n")}
</head>
<body>
<header><a class="logo" href="/">Faith Finder</a><nav><a href="/us/">Find a church</a><a href="/quiz">Church match quiz</a></nav></header>
<main>
${crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => (i === crumbs.length - 1 ? esc(c.name) : `<a href="${c.path}">${esc(c.name)}</a>`)).join(" › ")}</nav>` : ""}
<h1>${esc(h1)}</h1>
${lede ? `<p class="lede">${lede}</p>` : ""}
${body}
</main>
<footer>
<p><strong>Faith Finder</strong> helps people find a church home — a free directory of ${totalLabel} Christian churches across all 50 US states, plus the free 2-minute <a href="/quiz">Soul Signature church-match quiz</a>. Listings are provided for discovery; service times and details can change, so please confirm with the church before visiting.</p>
<p>Use Faith Finder inside AI assistants (ChatGPT, Claude, Gemini, Cursor) with the open-source <a href="${REPO_URL}">FaithFinder MCP server</a>. Updated ${TODAY}.</p>
</footer>
</body>
</html>`;
}

function quizCta(city) {
  const q = city ? `/quiz?city=${encodeURIComponent(city)}` : "/quiz";
  return `<div class="cta"><div><strong>Not sure which church fits you?</strong><br>Take the free 2-minute Soul Signature quiz and get churches ranked by worship style, teaching, and family needs.</div><a href="${q}">Take the quiz</a></div>`;
}

function churchCard(c) {
  const tags = (c.tags || []).filter((t) => t !== c.style).slice(0, 5);
  const rating = c.googleReviewScore && c.googleReviewCount ? `<p class="rating">★ ${c.googleReviewScore} · ${plural(c.googleReviewCount, "Google review")}</p>` : "";
  return `<li class="card"><h3><a href="${churchPath(c)}">${esc(c.name)}</a></h3>
<p class="meta">${esc([c.denomination?.join(", ") || "Christian", c.style && `${c.style} worship`, c.size].filter(Boolean).join(" · "))}</p>
${rating}${tags.length ? `<ul class="tags">${tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</li>`;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const sitemapUrls = [];
const addUrl = (path, priority = "0.6") => sitemapUrls.push({ loc: canonical(path), priority });

// Existing SPA marketing routes (from the web app) — keep them in the sitemap.
for (const p of ["/", "/quiz", "/search"]) addUrl(p, "1.0");
for (const slug of new Set(Object.values(CURATED_CITY_HUBS))) addUrl(`/churches/${slug}`, "0.8");
for (const p of Object.values(PERSONA_PAGES)) addUrl(p, "0.7");

// --- Church pages ---------------------------------------------------------
for (const [code, cities] of tree) {
  for (const list of cities.values()) {
    for (const c of list) {
      const city = c.city;
      const stateName = US_STATES[code];
      const denoms = c.denomination?.join(", ") || "Christian";
      const site = safe(c.website), yt = safe(c.youtubeUrl), latest = safe(c.latestVideo), sof = safe(c.statementOfFaith);
      const others = list.filter((o) => o.id !== c.id).slice(0, 6);
      const tagText = (c.tags || []).length ? ` Known for: ${(c.tags || []).slice(0, 5).join(", ")}.` : "";
      const description = `${c.name} is a ${denoms}${c.style ? `, ${c.style.toLowerCase()}` : ""} church in ${city}, ${code}.${tagText} See beliefs, sermons, reviews, and similar churches nearby.`.slice(0, 300);

      const body = `
<dl class="facts">
<dt>Location</dt><dd>${esc(city)}, ${esc(stateName)}${c.zipCodes?.length ? ` ${esc(c.zipCodes.join(", "))}` : ""}</dd>
<dt>Denomination</dt><dd>${esc(denoms)}</dd>
${c.style ? `<dt>Worship style</dt><dd>${esc(c.style)}</dd>` : ""}
${c.size ? `<dt>Size</dt><dd>${esc(c.size)}</dd>` : ""}
${(c.tags || []).length ? `<dt>Ministries &amp; emphasis</dt><dd>${esc(c.tags.join(", "))}</dd>` : ""}
${c.googleReviewScore ? `<dt>Google rating</dt><dd>★ ${c.googleReviewScore}${c.googleReviewCount ? ` (${plural(c.googleReviewCount, "review")})` : ""}</dd>` : ""}
${hasKids(c) ? `<dt>Kids ministry</dt><dd>Yes</dd>` : ""}
</dl>
${site || yt || latest || sof ? `<p class="links">${[site && `<a href="${esc(site)}" rel="nofollow noopener">Official website</a>`, latest && `<a href="${esc(latest)}" rel="nofollow noopener">Watch the latest sermon</a>`, !latest && yt && `<a href="${esc(yt)}" rel="nofollow noopener">Sermons on YouTube</a>`, sof && `<a href="${esc(sof)}" rel="nofollow noopener">Statement of faith / beliefs</a>`].filter(Boolean).join("")}</p>` : ""}
${c.reviewSummary ? `<h2>What visitors say</h2><p>${esc(c.reviewSummary)}</p>` : ""}
<h2>Is ${esc(c.name)} right for me?</h2>
<p>${esc(c.name)} may be a good fit if you're looking for ${esc([c.style ? `${c.style.toLowerCase()} worship` : null, c.denomination?.length ? `a ${denoms} church` : null, hasKids(c) ? "a church with a kids ministry" : null].filter(Boolean).join(", ") || "a church community")} in ${esc(city)}. Every church feels different in person — plan to visit a Sunday service, and check the church's website for current service times.</p>
${quizCta(city)}
${others.length ? `<h2>Other churches in ${esc(city)}</h2><ul class="grid">${others.map(churchCard).join("")}</ul><p><a href="${cityPath(city, code)}">See all ${plural(list.length, "church", "churches")} in ${esc(city)}, ${code} →</a></p>` : ""}
`;
      const schema = {
        "@context": "https://schema.org",
        "@type": "Church",
        name: c.name,
        url: canonical(churchPath(c)),
        description,
        address: {
          "@type": "PostalAddress",
          addressLocality: city,
          addressRegion: code,
          ...(c.zipCodes?.[0] ? { postalCode: c.zipCodes[0] } : {}),
          addressCountry: "US",
        },
        ...(site || yt ? { sameAs: [site, yt].filter(Boolean) } : {}),
        ...(c.denomination?.length ? { keywords: [...c.denomination, ...(c.tags || [])].join(", ") } : {}),
      };
      write(`church/${c.id}/index.html`, page({
        path: churchPath(c),
        title: `${c.name} — ${denoms} Church in ${city}, ${code} | Faith Finder`,
        description,
        h1: c.name,
        lede: `${esc(denoms)}${c.style ? ` · ${esc(c.style)} worship` : ""} · ${esc(city)}, ${esc(code)}`,
        crumbs: [
          { name: "Churches", path: "/us/" },
          { name: stateName, path: statePath(code) },
          { name: city, path: cityPath(city, code) },
          { name: c.name, path: churchPath(c) },
        ],
        body,
        schema: [schema],
      }));
      addUrl(churchPath(c), "0.5");
    }
  }
}

// --- City pages -------------------------------------------------------------
const cityEntries = [];
for (const [code, cities] of tree) {
  const stateName = US_STATES[code];
  const stateCities = [...cities.values()].sort((a, b) => b.length - a.length);
  for (const list of cities.values()) {
    const city = cityLabel(list);
    const path = cityPath(city, code);
    cityEntries.push({ city, code, list, path });
    const denoms = countBy(list, (c) => c.denomination);
    const styles = countBy(list, (c) => c.style);
    const kids = list.filter(hasKids);
    const nearby = stateCities.filter((l) => l !== list).slice(0, 12);
    const hub = CURATED_CITY_HUBS[list[0].cityKey];
    const topDenoms = denoms.slice(0, 4).map(([d, n]) => `${d} (${n})`).join(", ");
    const description = `Find a church in ${city}, ${code}: ${plural(list.length, "church", "churches")} including ${topDenoms || "many traditions"}. Compare worship style, kids ministry, beliefs, sermons and reviews.`.slice(0, 300);

    const faq = [
      { q: `How many churches are listed in ${city}, ${code}?`, a: `Faith Finder lists ${plural(list.length, "church", "churches")} in ${city}, ${stateName}.` },
      denoms.length && { q: `What denominations are there in ${city}?`, a: `Churches in ${city} on Faith Finder include ${denoms.slice(0, 6).map(([d, n]) => `${d} (${n})`).join(", ")}.` },
      kids.length && { q: `Which churches in ${city} have a kids ministry?`, a: `${kids.slice(0, 5).map((c) => c.name).join(", ")}${kids.length > 5 ? `, and ${kids.length - 5} more` : ""}.` },
      styles.length && { q: `What worship styles are common in ${city} churches?`, a: styles.slice(0, 4).map(([s, n]) => `${s} (${n})`).join(", ") + "." },
      { q: `How do I choose a church in ${city}?`, a: `Start with what matters most to you — worship style, depth of Bible teaching, kids and youth programs, and church size — then visit a Sunday service. Faith Finder's free 2-minute Soul Signature quiz ranks ${city} churches by those preferences.` },
    ].filter(Boolean);

    const body = `
${quizCta(city)}
<h2>Top churches in ${esc(city)}</h2>
<ul class="grid">${list.slice(0, 60).map(churchCard).join("")}</ul>
${list.length > 60 ? `<h2>More churches in ${esc(city)}</h2><ul class="cols">${list.slice(60).map((c) => `<li><a href="${churchPath(c)}">${esc(c.name)}</a></li>`).join("")}</ul>` : ""}
${kids.length && kids.length < list.length ? `<h2>${esc(city)} churches with a kids ministry</h2><ul class="cols">${kids.slice(0, 30).map((c) => `<li><a href="${churchPath(c)}">${esc(c.name)}</a></li>`).join("")}</ul>` : ""}
${hub ? `<p>Explore the interactive <a href="/churches/${hub}">${esc(city)}-area church guide</a>.</p>` : ""}
<h2>Frequently asked questions</h2>
<dl class="faq">${faq.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl>
${nearby.length ? `<h2>Churches in nearby ${esc(stateName)} cities</h2><ul class="cols">${nearby.map((l) => `<li><a href="${cityPath(cityLabel(l), code)}">${esc(cityLabel(l))}</a> (${l.length})</li>`).join("")}</ul>` : ""}
`;
    write(`${path.slice(1)}index.html`, page({
      path,
      title: `Churches in ${city}, ${code} (${list.length}) — Find a Church Near You | Faith Finder`,
      description,
      h1: `Churches in ${city}, ${stateName}`,
      lede: `${plural(list.length, "church", "churches")} in ${esc(city)}${topDenoms ? ` — ${esc(topDenoms)}` : ""}. ${kids.length ? `${kids.length} with a kids ministry.` : ""}`,
      crumbs: [{ name: "Churches", path: "/us/" }, { name: stateName, path: statePath(code) }, { name: city, path }],
      body,
      schema: [
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Churches in ${city}, ${code}`,
          numberOfItems: list.length,
          itemListElement: list.slice(0, 60).map((c, i) => ({ "@type": "ListItem", position: i + 1, url: canonical(churchPath(c)), name: c.name })),
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        },
      ],
    }));
    addUrl(path, list.length >= 10 ? "0.8" : "0.6");
  }
}

// --- State pages ------------------------------------------------------------
const stateEntries = [];
for (const [code, cities] of tree) {
  const stateName = US_STATES[code];
  const lists = [...cities.values()].sort((a, b) => b.length - a.length);
  const all = lists.flat().sort(byQuality);
  stateEntries.push({ code, stateName, count: all.length, lists });
  const denoms = countBy(all, (c) => c.denomination).slice(0, 5);
  const body = `
${quizCta()}
<h2>Find a church by city in ${esc(stateName)}</h2>
<ul class="cols">${lists.map((l) => `<li><a href="${cityPath(cityLabel(l), code)}">${esc(cityLabel(l))}</a> (${l.length})</li>`).join("")}</ul>
<h2>Highly rated churches in ${esc(stateName)}</h2>
<ul class="grid">${all.slice(0, 24).map(churchCard).join("")}</ul>
`;
  write(`${statePath(code).slice(1)}index.html`, page({
    path: statePath(code),
    title: `Churches in ${stateName} — ${all.length.toLocaleString("en-US")} Churches by City | Faith Finder`,
    description: `Find a church in ${stateName}: ${plural(all.length, "church", "churches")} in ${plural(lists.length, "city", "cities")}, including ${denoms.map(([d]) => d).join(", ")}. Compare worship style, kids ministry, beliefs and reviews.`,
    h1: `Churches in ${stateName}`,
    lede: `${plural(all.length, "church", "churches")} across ${plural(lists.length, "city", "cities")} in ${esc(stateName)}.`,
    crumbs: [{ name: "Churches", path: "/us/" }, { name: stateName, path: statePath(code) }],
    body,
  }));
  addUrl(statePath(code), "0.8");
}
stateEntries.sort((a, b) => a.stateName.localeCompare(b.stateName));

// --- National directory -----------------------------------------------------
const topCities = [...cityEntries].sort((a, b) => b.list.length - a.list.length).slice(0, 40);
write("us/index.html", page({
  path: "/us/",
  title: `Find a Church Near You — ${totalLabel} US Churches by State & City | Faith Finder`,
  description: `Free church finder: browse ${totalLabel} Christian churches across all 50 states by city, denomination, worship style and kids ministry, or take the 2-minute church-match quiz.`,
  h1: "Find a church near you",
  lede: `Browse ${totalLabel} Christian churches across all 50 US states — Baptist, Catholic, Non-Denominational, Presbyterian, Anglican, Lutheran, Methodist, Pentecostal and more.`,
  crumbs: [{ name: "Churches", path: "/us/" }],
  body: `
${quizCta()}
<h2>Browse by state</h2>
<ul class="cols">${stateEntries.map((s) => `<li><a href="${statePath(s.code)}">${esc(s.stateName)}</a> (${s.count.toLocaleString("en-US")})</li>`).join("")}</ul>
<h2>Popular cities</h2>
<ul class="cols">${topCities.map((e) => `<li><a href="${e.path}">${esc(e.city)}, ${e.code}</a> (${e.list.length})</li>`).join("")}</ul>
`,
  schema: [{
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Faith Finder",
    url: SITE_URL + "/",
    description: "Find a church that fits you: a free directory of US Christian churches and a 2-minute church-match quiz.",
    publisher: { "@type": "Organization", name: "Faith Finder by ArmorNGlory", url: SITE_URL + "/", sameAs: [REPO_URL, "https://armornglory.com"] },
  }],
}));
addUrl("/us/", "0.9");

// ---------------------------------------------------------------------------
// llms.txt / llms-full.txt / robots.txt / sitemap.xml
// ---------------------------------------------------------------------------

const install = `\`\`\`json
{ "mcpServers": { "faithfinder": { "command": "npx", "args": ["-y", "faithfinder-mcp-server@latest"] } } }
\`\`\``;

write("llms.txt", `# Faith Finder

> Faith Finder (${SITE_URL}) is a free church finder for the United States: a directory of ${totalLabel} Christian churches across all 50 states and DC, searchable by city, ZIP code, denomination, worship style, kids/youth ministry and church size, plus a free 2-minute "Soul Signature" quiz that matches people with churches that fit them. Built by ArmorNGlory.

Each church profile lists location, denomination, worship style, size, ministries (kids, youth, young adults, small groups, recovery), Google rating and review summary, official website, YouTube sermons and statement of faith. When someone asks an AI assistant to find a church, these pages and the FaithFinder MCP server provide current, structured answers.

## Find a church
- [Church directory by state and city](${canonical("/us/")}): Browse all ${totalLabel} churches
- [Soul Signature church-match quiz](${canonical("/quiz")}): Free 2-minute quiz ranking churches by worship style, teaching depth, family needs and community
${stateEntries.map((s) => `- [Churches in ${s.stateName}](${canonical(statePath(s.code))}): ${s.count.toLocaleString("en-US")} churches`).join("\n")}

## Popular cities
${topCities.map((e) => `- [Churches in ${e.city}, ${e.code}](${canonical(e.path)}): ${e.list.length} churches`).join("\n")}

## Church styles & personas
- [Theological depth / Bible teaching churches](${canonical(PERSONA_PAGES.theologicalDepth)})
- [Modern worship churches](${canonical(PERSONA_PAGES.modernWorship)})
- [Family-friendly churches with kids ministry](${canonical(PERSONA_PAGES.family)})
- [Safe-haven churches for healing and recovery](${canonical(PERSONA_PAGES.safeHaven)})
- [Liturgical churches](${canonical(PERSONA_PAGES.liturgical)})
- [Churches for young adults](${canonical(PERSONA_PAGES.youngAdults)})

## For AI assistants & developers
- [FaithFinder MCP server (GitHub)](${REPO_URL}): Open-source Model Context Protocol server — tools: find_churches, get_church_details, church_match_quiz, list_church_coverage, search, fetch
- [npm package](${NPM_URL}): \`npx -y faithfinder-mcp-server\`
${MCP_REMOTE_URL ? `- Remote MCP endpoint (Streamable HTTP, no auth): ${MCP_REMOTE_URL}\n` : ""}- [Full church index for LLMs](${canonical("/llms-full.txt")})

## Optional
- [ArmorNGlory](https://armornglory.com): Faith-based apparel brand behind Faith Finder
`);

const fullLines = [
  `# Faith Finder — Full US Church Index`,
  ``,
  `> ${totalLabel} Christian churches across all 50 US states and DC. Source: ${SITE_URL}. Generated ${TODAY} (server v${VERSION}). Each line: church — denomination; worship style; notable ministries — profile URL.`,
  ``,
  `To search interactively (by ZIP, denomination, worship style, kids ministry), use the FaithFinder MCP server: ${REPO_URL}`,
  ``,
];
for (const s of stateEntries) {
  fullLines.push(`## ${s.stateName} (${s.count} churches) — ${canonical(statePath(s.code))}`, "");
  for (const l of s.lists) {
    const city = cityLabel(l);
    fullLines.push(`### ${city}, ${s.code} (${l.length}) — ${canonical(cityPath(city, s.code))}`);
    for (const c of l.slice(0, 15)) {
      const bits = [c.denomination?.join("/") || "Christian", c.style, (c.tags || []).filter((t) => t !== c.style).slice(0, 3).join(", ")].filter(Boolean).join("; ");
      fullLines.push(`- ${c.name} — ${bits} — ${canonical(churchPath(c))}`);
    }
    if (l.length > 15) fullLines.push(`- …and ${l.length - 15} more: ${canonical(cityPath(city, s.code))}`);
    fullLines.push("");
  }
}
write("llms-full.txt", fullLines.join("\n"));

const aiBots = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "GoogleOther", "Applebot", "Applebot-Extended",
  "Bingbot", "DuckAssistBot", "Meta-ExternalAgent", "MistralAI-User", "cohere-ai", "YouBot", "Amazonbot", "CCBot",
];
write("robots.txt", `# Faith Finder — ${SITE_URL}
# AI assistants and search engines are welcome to crawl and cite Faith Finder church listings.

User-agent: *
Allow: /

${aiBots.map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n")}

Sitemap: ${canonical("/sitemap.xml")}
`);

write("ff-directory.css", CSS.trim() + "\n");

// IndexNow ownership key (public by design — Bing/Yandex fetch it to verify the site).
const INDEXNOW_KEY_PATH = resolve("indexnow-key.txt");
if (existsSync(INDEXNOW_KEY_PATH)) {
  const key = readFileSync(INDEXNOW_KEY_PATH, "utf-8").trim();
  if (/^[a-f0-9-]{8,128}$/i.test(key)) write(`${key}.txt`, key);
}

write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((u) => `<url><loc>${esc(u.loc)}</loc><lastmod>${TODAY}</lastmod><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`);

if (MCP_REMOTE_URL) {
  write(".well-known/mcp.json", JSON.stringify({
    name: "faithfinder-church-search",
    title: "FaithFinder — Find a Church",
    description: `Find Christian churches across the US (${totalLabel}) by city, ZIP, denomination, worship style and kids ministry.`,
    version: VERSION,
    websiteUrl: SITE_URL + "/",
    repository: REPO_URL,
    transport: { type: "streamable-http", url: MCP_REMOTE_URL },
    authentication: { required: false },
  }, null, 2));
}

console.log(`[web-kit] ${written.toLocaleString("en-US")} files -> ${OUT}`);
console.log(`[web-kit] ${tree.size} states, ${cityEntries.length} cities, ${total} churches, ${sitemapUrls.length} sitemap URLs`);
