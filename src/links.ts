/**
 * Canonical FaithFinder URLs.
 *
 * IMPORTANT: The canonical public site is https://faithfinder.armornglory.com.
 * (faithfinder.app is NOT owned by FaithFinder — never link to it.)
 *
 * Only link to routes that actually exist:
 *  - SPA routes in the web app: /quiz, /search, /churches/{curated-city}, /personas/*, /styles/*
 *  - Static, crawlable pages produced by `npm run build:web` (scripts/build-web-kit.mjs):
 *      /us/                         national directory
 *      /us/{state}/                 state directory
 *      /us/{state}/{city}/          city directory
 *      /church/{state}/{city}/{slug}/  church profile
 */

import { IndexedChurch, normalizeCity, slugify, toStateCode } from "./data.js";

export const SITE_URL = (process.env.FAITHFINDER_SITE_URL || "https://faithfinder.armornglory.com").replace(/\/+$/, "");

const UTM = "utm_source=ai_assistant&utm_medium=mcp";

function withUtm(path: string, params?: Record<string, string | undefined>): string {
  const url = new URL(path, SITE_URL + "/");
  for (const [k, v] of Object.entries(params || {})) if (v) url.searchParams.set(k, v);
  for (const pair of UTM.split("&")) {
    const [k, v] = pair.split("=");
    url.searchParams.set(k, v);
  }
  return url.toString();
}

/** Plain canonical URL (no tracking) — used in static pages, sitemaps, llms.txt. */
export function canonical(path: string): string {
  return new URL(path, SITE_URL + "/").toString();
}

/** Cities with a curated interactive landing page in the web app (src/store/campaignStore.ts CURATED_CITIES). */
export const CURATED_CITY_HUBS: Record<string, string> = {
  dallas: "dallas", frisco: "dallas", plano: "dallas", mckinney: "dallas", allen: "dallas", southlake: "dallas",
  nashville: "nashville", franklin: "nashville", brentwood: "nashville",
  orlando: "orlando", charlotte: "charlotte",
  atlanta: "atlanta", alpharetta: "atlanta", marietta: "atlanta",
  austin: "austin", birmingham: "birmingham", "oklahoma city": "okc", okc: "okc",
  houston: "houston", chicago: "chicago", miami: "miami", denver: "denver", phoenix: "phoenix",
};

export const PERSONA_PAGES = {
  theologicalDepth: "/personas/theological-depth",
  modernWorship: "/personas/modern-worship",
  family: "/personas/family-churches",
  safeHaven: "/personas/safe-haven",
  liturgical: "/styles/liturgical",
  youngAdults: "/styles/young-adults",
  churchPlant: "/styles/church-plant",
} as const;

export function churchPath(c: Pick<IndexedChurch, "id">): string {
  return `/church/${c.id}/`;
}

export function cityPath(city: string, stateCode: string): string {
  return `/us/${stateCode.toLowerCase()}/${slugify(city)}/`;
}

export function statePath(stateCode: string): string {
  return `/us/${stateCode.toLowerCase()}/`;
}

export function churchProfileUrl(c: IndexedChurch): string {
  // Static profile pages are only generated for churches with a known state + city.
  if (!c.stateCode || !c.cityKey) return withUtm("/us/");
  return withUtm(churchPath(c));
}

export function cityDirectoryUrl(city?: string | null, state?: string | null): string {
  const code = toStateCode(state);
  if (city && code) return withUtm(cityPath(city, code));
  if (code) return withUtm(statePath(code));
  return withUtm("/us/");
}

/** Interactive curated city hub in the SPA, when one exists. */
export function curatedCityHubUrl(city?: string | null): string | null {
  const key = normalizeCity(city);
  const slug = CURATED_CITY_HUBS[key];
  return slug ? withUtm(`/churches/${slug}`) : null;
}

export function quizUrl(opts: { city?: string | null; denomination?: string | null; focus?: string | null } = {}): string {
  return withUtm("/quiz", {
    city: opts.city || undefined,
    denomination: opts.denomination || undefined,
    focus: opts.focus || undefined,
  });
}

export function personaUrl(path: string): string {
  return withUtm(path);
}

export const DIRECTORY_URL = withUtm("/us/");
export const HOME_URL = SITE_URL + "/";
export const REPO_URL = "https://github.com/ArmorNGlory/faithfinder-mcp-server";
export const NPM_URL = "https://www.npmjs.com/package/faithfinder-mcp-server";
