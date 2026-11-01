/**
 * Canonical FaithFinder URLs.
 *
 * IMPORTANT: The canonical public site is https://faithfinder.armornglory.com.
 * (faithfinder.app is NOT owned by FaithFinder — never link to it.)
 *
 * Only link to routes that actually exist (all canonicalized with trailing slashes):
 *  - SPA / static marketing routes in the web app:
 *      /quiz/, /search/, /map/, /service-times/,
 *      /churches/{curated-hub}/, /personas/{slug}/, /styles/{slug}/
 *  - Static, crawlable pages produced by `npm run build:web` (scripts/build-web-kit.mjs):
 *      /us/                            national directory
 *      /us/{state}/                    state directory
 *      /us/{state}/{city}/             city directory
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

/** All 36 live curated metro/state hub slugs on faithfinder.armornglory.com/churches/{slug}/. */
export const CURATED_HUB_METADATA: Record<string, { label: string; states: string[] }> = {
  atlanta: { label: "Atlanta", states: ["GA"] },
  austin: { label: "Austin", states: ["TX"] },
  birmingham: { label: "Birmingham", states: ["AL"] },
  boston: { label: "Boston", states: ["MA"] },
  california: { label: "California", states: ["CA"] },
  charlotte: { label: "Charlotte", states: ["NC", "SC"] },
  chicago: { label: "Chicago", states: ["IL"] },
  cincinnati: { label: "Cincinnati", states: ["OH", "KY"] },
  "colorado-springs": { label: "Colorado Springs", states: ["CO"] },
  columbus: { label: "Columbus", states: ["OH"] },
  dallas: { label: "Dallas–Fort Worth", states: ["TX"] },
  dc: { label: "Washington, D.C.", states: ["DC", "VA", "MD"] },
  denver: { label: "Denver", states: ["CO"] },
  detroit: { label: "Detroit", states: ["MI"] },
  houston: { label: "Houston", states: ["TX"] },
  indianapolis: { label: "Indianapolis", states: ["IN"] },
  "kansas-city": { label: "Kansas City", states: ["MO", "KS"] },
  "las-vegas": { label: "Las Vegas", states: ["NV"] },
  "los-angeles": { label: "Los Angeles & Orange County", states: ["CA"] },
  miami: { label: "South Florida & Miami", states: ["FL"] },
  nashville: { label: "Nashville", states: ["TN"] },
  "new-york": { label: "New York City", states: ["NY", "NJ"] },
  okc: { label: "Oklahoma City", states: ["OK"] },
  orlando: { label: "Orlando", states: ["FL"] },
  philadelphia: { label: "Philadelphia", states: ["PA", "NJ"] },
  phoenix: { label: "Phoenix", states: ["AZ"] },
  pittsburgh: { label: "Pittsburgh", states: ["PA"] },
  portland: { label: "Portland", states: ["OR", "WA"] },
  raleigh: { label: "Raleigh–Durham", states: ["NC"] },
  "san-antonio": { label: "San Antonio", states: ["TX"] },
  "san-diego": { label: "San Diego", states: ["CA"] },
  "san-francisco": { label: "San Francisco Bay Area", states: ["CA"] },
  seattle: { label: "Seattle", states: ["WA"] },
  "st-louis": { label: "St. Louis", states: ["MO", "IL"] },
  tampa: { label: "Tampa Bay", states: ["FL"] },
  "twin-cities": { label: "Twin Cities", states: ["MN"] },
};

/** City -> curated hub slug (for non-homonym cities; homonyms resolved with state below). */
export const CURATED_CITY_HUBS: Record<string, string> = {
  // Atlanta
  atlanta: "atlanta", alpharetta: "atlanta", marietta: "atlanta", roswell: "atlanta",
  "sandy springs": "atlanta", "johns creek": "atlanta", decatur: "atlanta", kennesaw: "atlanta",
  duluth: "atlanta", lawrenceville: "atlanta", dacula: "atlanta",
  // Austin
  austin: "austin", "round rock": "austin", "cedar park": "austin", georgetown: "austin", pflugerville: "austin",
  // Birmingham
  birmingham: "birmingham", hoover: "birmingham", trussville: "birmingham",
  // Boston
  boston: "boston", cambridge: "boston", somerville: "boston", brookline: "boston",
  quincy: "boston", newton: "boston", lexington: "boston", waltham: "boston",
  // Charlotte
  charlotte: "charlotte", matthews: "charlotte", huntersville: "charlotte", concord: "charlotte",
  mooresville: "charlotte", "fort mill": "charlotte",
  // Chicago
  chicago: "chicago", naperville: "chicago", wheaton: "chicago", evanston: "chicago",
  schaumburg: "chicago", barrington: "chicago", "orland park": "chicago", glenview: "chicago",
  // Cincinnati
  cincinnati: "cincinnati", mason: "cincinnati", "blue ash": "cincinnati",
  covington: "cincinnati", "fort mitchell": "cincinnati", florence: "cincinnati",
  // Colorado Springs
  "colorado springs": "colorado-springs",
  // Columbus
  columbus: "columbus", dublin: "columbus", westerville: "columbus", "upper arlington": "columbus",
  hilliard: "columbus", powell: "columbus", "grove city": "columbus", delaware: "columbus",
  // Dallas–Fort Worth
  dallas: "dallas", "fort worth": "dallas", frisco: "dallas", plano: "dallas", mckinney: "dallas",
  allen: "dallas", southlake: "dallas", irving: "dallas", grapevine: "dallas", colleyville: "dallas",
  richardson: "dallas", carrollton: "dallas", denton: "dallas",
  // Washington, D.C.
  washington: "dc", alexandria: "dc", bethesda: "dc", "silver spring": "dc", fairfax: "dc", vienna: "dc", reston: "dc", ashburn: "dc",
  // Denver
  denver: "denver", littleton: "denver", aurora: "denver", lakewood: "denver", arvada: "denver",
  "highlands ranch": "denver", boulder: "denver", "castle rock": "denver", englewood: "denver",
  // Detroit
  detroit: "detroit", troy: "detroit", rochester: "detroit", "royal oak": "detroit",
  "ann arbor": "detroit", novi: "detroit", livonia: "detroit", northville: "detroit",
  // Houston
  houston: "houston", "sugar land": "houston", katy: "houston", "the woodlands": "houston",
  spring: "houston", pearland: "houston", cypress: "houston", humble: "houston",
  // Indianapolis
  indianapolis: "indianapolis", carmel: "indianapolis", fishers: "indianapolis",
  noblesville: "indianapolis", greenwood: "indianapolis", zionsville: "indianapolis",
  // Kansas City
  "kansas city": "kansas-city", "overland park": "kansas-city", olathe: "kansas-city",
  leawood: "kansas-city", "shawnee mission": "kansas-city", "lees summit": "kansas-city",
  independence: "kansas-city", liberty: "kansas-city", "blue springs": "kansas-city",
  // Las Vegas
  "las vegas": "las-vegas", "north las vegas": "las-vegas", henderson: "las-vegas",
  // Los Angeles & Orange County
  "los angeles": "los-angeles", "long beach": "los-angeles", anaheim: "los-angeles",
  irvine: "los-angeles", "santa ana": "los-angeles", orange: "los-angeles",
  "huntington beach": "los-angeles", fullerton: "los-angeles", "costa mesa": "los-angeles",
  "newport beach": "los-angeles", burbank: "los-angeles", "santa monica": "los-angeles",
  torrance: "los-angeles", pomona: "los-angeles", claremont: "los-angeles", brea: "los-angeles", "lake forest": "los-angeles",
  // Miami / South Florida
  miami: "miami", "fort lauderdale": "miami", "coral gables": "miami", pinecrest: "miami",
  "boca raton": "miami", "west palm beach": "miami", "pompano beach": "miami",
  // Nashville
  nashville: "nashville", franklin: "nashville", brentwood: "nashville",
  murfreesboro: "nashville", hendersonville: "nashville", "mount juliet": "nashville",
  // New York
  "new york": "new-york", brooklyn: "new-york", queens: "new-york", astoria: "new-york",
  // Oklahoma City
  "oklahoma city": "okc", okc: "okc", edmond: "okc", norman: "okc", moore: "okc", mustang: "okc",
  // Orlando
  orlando: "orlando", "winter park": "orlando", kissimmee: "orlando", oviedo: "orlando",
  // Philadelphia
  philadelphia: "philadelphia", "west chester": "philadelphia", ambler: "philadelphia", "cherry hill": "philadelphia",
  // Phoenix
  phoenix: "phoenix", scottsdale: "phoenix", mesa: "phoenix", chandler: "phoenix",
  gilbert: "phoenix", tempe: "phoenix", peoria: "phoenix", goodyear: "phoenix",
  // Pittsburgh
  pittsburgh: "pittsburgh", sewickley: "pittsburgh", wexford: "pittsburgh",
  // Portland
  portland: "portland", beaverton: "portland", "lake oswego": "portland", tigard: "portland",
  // Raleigh–Durham
  raleigh: "raleigh", durham: "raleigh", "chapel hill": "raleigh", cary: "raleigh", "wake forest": "raleigh",
  // San Antonio
  "san antonio": "san-antonio", boerne: "san-antonio", "new braunfels": "san-antonio",
  // San Diego
  "san diego": "san-diego", "la jolla": "san-diego", "chula vista": "san-diego",
  carlsbad: "san-diego", oceanside: "san-diego", encinitas: "san-diego", "el cajon": "san-diego",
  // San Francisco Bay Area
  "san francisco": "san-francisco", oakland: "san-francisco", berkeley: "san-francisco",
  "san jose": "san-francisco", "palo alto": "san-francisco", sunnyvale: "san-francisco",
  fremont: "san-francisco", "walnut creek": "san-francisco", "menlo park": "san-francisco",
  // Seattle
  seattle: "seattle", bellevue: "seattle", kirkland: "seattle", redmond: "seattle",
  tacoma: "seattle", bothell: "seattle", woodinville: "seattle", sammamish: "seattle", edmonds: "seattle",
  // St. Louis
  "st louis": "st-louis", chesterfield: "st-louis", ballwin: "st-louis", "st charles": "st-louis", ofallon: "st-louis",
  // Tampa Bay
  tampa: "tampa", "st petersburg": "tampa", clearwater: "tampa", brandon: "tampa",
  // Twin Cities
  minneapolis: "twin-cities", "st paul": "twin-cities", "eden prairie": "twin-cities",
  minnetonka: "twin-cities", osseo: "twin-cities", burnsville: "twin-cities", rosemount: "twin-cities", stillwater: "twin-cities",
};

/** Disambiguate cities that exist in more than one metro state. */
const STATE_CITY_OVERRIDES: Record<string, string> = {
  "TX|arlington": "dallas",
  "VA|arlington": "dc",
  "MA|arlington": "boston",
  "CA|pasadena": "los-angeles",
  "TX|pasadena": "houston",
  "CA|glendale": "los-angeles",
  "AZ|glendale": "phoenix",
  "GA|smyrna": "atlanta",
  "TN|smyrna": "nashville",
  "CA|brentwood": "san-francisco",
  "TN|brentwood": "nashville",
  "FL|brandon": "tampa",
  "MS|brandon": "",
  "OH|west chester": "cincinnati",
  "PA|west chester": "philadelphia",
};

export const PERSONA_PAGES = {
  theologicalDepth: "/personas/theological-depth/",
  modernWorship: "/personas/modern-worship/",
  family: "/personas/family-churches/",
  safeHaven: "/personas/safe-haven/",
  liturgical: "/styles/liturgical/",
  youngAdults: "/styles/young-adults/",
  churchPlant: "/styles/church-plant/",
} as const;

export const FEATURE_PAGES = {
  map: "/map/",
  serviceTimes: "/service-times/",
  search: "/search/",
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
  if (!c.stateCode || !c.cityKey) return withUtm("/us/");
  return withUtm(churchPath(c));
}

export function cityDirectoryUrl(city?: string | null, state?: string | null): string {
  const code = toStateCode(state);
  if (city && code) return withUtm(cityPath(city, code));
  if (code) return withUtm(statePath(code));
  return withUtm("/us/");
}

/** Resolve curated city/state hub info ({ slug, label, url }) when a live guide exists. */
export function curatedCityHubInfo(
  city?: string | null,
  state?: string | null
): { slug: string; label: string; url: string } | null {
  const key = normalizeCity(city);
  const code = toStateCode(state);

  if (code && key && `${code}|${key}` in STATE_CITY_OVERRIDES) {
    const override = STATE_CITY_OVERRIDES[`${code}|${key}`];
    if (!override) return null;
    const meta = CURATED_HUB_METADATA[override];
    return { slug: override, label: meta.label, url: withUtm(`/churches/${override}/`) };
  }

  const candidate = key ? CURATED_CITY_HUBS[key] : undefined;
  if (candidate) {
    const meta = CURATED_HUB_METADATA[candidate];
    if (!code || meta.states.includes(code)) {
      return { slug: candidate, label: meta.label, url: withUtm(`/churches/${candidate}/`) };
    }
  }

  if (code === "CA") {
    return { slug: "california", label: "California", url: withUtm("/churches/california/") };
  }
  return null;
}

/** Interactive curated city hub in the SPA, when one exists. */
export function curatedCityHubUrl(city?: string | null, state?: string | null): string | null {
  return curatedCityHubInfo(city, state)?.url ?? null;
}

export function quizUrl(opts: { city?: string | null; denomination?: string | null; focus?: string | null } = {}): string {
  return withUtm("/quiz/", {
    city: opts.city || undefined,
    denomination: opts.denomination || undefined,
    focus: opts.focus || undefined,
  });
}

export function personaUrl(path: string): string {
  return withUtm(path);
}

export const DIRECTORY_URL = withUtm("/us/");
export const MAP_URL = withUtm(FEATURE_PAGES.map);
export const SERVICE_TIMES_URL = withUtm(FEATURE_PAGES.serviceTimes);
export const HOME_URL = SITE_URL + "/";
export const REPO_URL = "https://github.com/ArmorNGlory/faithfinder-mcp-server";
export const NPM_URL = "https://www.npmjs.com/package/faithfinder-mcp-server";
