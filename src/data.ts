/**
 * Church data loading + normalization.
 *
 * The raw dataset mixes full state names ("Texas") with postal codes ("TX"),
 * so every record is normalized once at startup to a canonical full state
 * name + postal code. This prevents bugs like "CA" matching "North Carolina"
 * or "IN" matching "Washington".
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

export interface Church {
  name: string;
  region?: string;
  city?: string;
  state?: string;
  zipCodes?: string[];
  website?: string;
  youtubeUrl?: string;
  latestVideo?: string;
  statementOfFaith?: string;
  denomination?: string[];
  style?: string;
  size?: string;
  tags?: string[];
  googleReviewScore?: number;
  googleReviewCount?: number;
  reviewSummary?: string;
}

/** A church record enriched with normalized fields used for search. */
export interface IndexedChurch extends Church {
  id: string;
  stateName: string | null;
  stateCode: string | null;
  cityKey: string;
  qualityScore: number;
}

export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATES).map(([code, name]) => [name.toLowerCase(), code])
);
STATE_NAME_TO_CODE["washington dc"] = "DC";
STATE_NAME_TO_CODE["washington d.c."] = "DC";

/** Resolve "tx", "TX", "Texas", "texas", "north_carolina" -> "TX". Returns null if unknown. */
export function toStateCode(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (US_STATES[upper]) return upper;
  const lower = raw.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
  return STATE_NAME_TO_CODE[lower] ?? null;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeCity(city?: string | null): string {
  return (city || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\bsaint\b/g, "st")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse repeated suffix segments: "X - Plano Campus - Plano Campus" -> "X - Plano Campus". */
export function cleanName(name: string): string {
  const parts = name.trim().replace(/\s+/g, " ").split(" - ");
  const out: string[] = [];
  for (const p of parts) {
    const sofar = out.join(" ").toLowerCase();
    if (!out.length || !sofar.includes(p.toLowerCase().replace(/\s*campus$/, "").trim() + (p.toLowerCase().endsWith("campus") ? " campus" : ""))) out.push(p);
  }
  return out.join(" - ");
}

function computeQuality(c: Church): number {
  let q = 0;
  if (c.googleReviewScore && c.googleReviewCount) {
    q += c.googleReviewScore * Math.log10(c.googleReviewCount + 1) * 2;
  }
  if (c.website) q += 2;
  if (c.youtubeUrl || c.latestVideo) q += 2;
  if (c.statementOfFaith) q += 1.5;
  if (c.tags?.length) q += Math.min(c.tags.length, 6) * 0.25;
  return Math.round(q * 100) / 100;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

export function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, "package.json"), "utf-8"));
    return String(pkg.version || "0.0.0");
  } catch {
    return "0.0.0";
  }
}

export function loadChurches(path = join(PROJECT_ROOT, "data", "churches.json")): IndexedChurch[] {
  const raw = JSON.parse(readFileSync(path, "utf-8")) as Church[];
  const seenIds = new Map<string, number>();

  return raw
    .filter((c) => c && typeof c.name === "string" && c.name.trim())
    .map((c) => ({ ...c, name: cleanName(c.name) }))
    .map((c) => {
      const stateCode = toStateCode(c.state) ?? toStateCode(c.region);
      const baseId = `${(stateCode || "us").toLowerCase()}/${slugify(c.city || "unknown") || "unknown"}/${slugify(c.name) || "church"}`;
      const n = seenIds.get(baseId) ?? 0;
      seenIds.set(baseId, n + 1);
      return {
        ...c,
        id: n === 0 ? baseId : `${baseId}-${n + 1}`,
        stateCode,
        stateName: stateCode ? US_STATES[stateCode] : c.state ?? null,
        cityKey: normalizeCity(c.city),
        qualityScore: computeQuality(c),
      };
    });
}
