/**
 * Search engine tuned for natural-language chat queries such as
 * "churches near me in Frisco TX with a good kids program".
 */

import { IndexedChurch, normalizeCity, toStateCode, US_STATES } from "./data.js";

export interface SearchFilters {
  query?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  denomination?: string;
  worshipStyle?: string;
  hasKidsMinistry?: boolean;
  churchSize?: string;
  theology?: string;
  limit?: number;
}

export interface SearchOutcome {
  results: IndexedChurch[];
  totalMatches: number;
  interpreted: {
    city: string | null;
    stateCode: string | null;
    zipCode: string | null;
    keywords: string[];
  };
  /** Human-readable notes about relaxed filters, so the assistant can be honest with the user. */
  notes: string[];
}

const STOPWORDS = new Set([
  "a", "an", "the", "in", "on", "at", "of", "for", "to", "and", "or", "with", "near", "nearby", "me",
  "my", "i", "im", "we", "our", "us", "around", "area", "find", "show", "list", "looking", "look",
  "want", "need", "good", "best", "great", "top", "recommend", "recommended", "recommendation",
  "recommendations", "church", "churches", "congregation", "congregations", "place", "places",
  "worship", "go", "attend", "new", "local", "close", "closest", "some", "any", "that", "has", "have",
  "is", "are", "where", "what", "which", "can", "you", "please", "help", "city", "town", "moving",
  "moved", "move", "visit", "visiting", "sunday", "service", "services", "christian",
]);
// Note: "new" is a stopword only after city extraction, so "New York"/"New Orleans" still resolve.

const CITY_ALIASES: Record<string, string> = {
  nyc: "new york", "new york city": "new york", manhattan: "new york", philly: "philadelphia",
  sf: "san francisco", okc: "oklahoma city", atl: "atlanta", dfw: "dallas", nola: "new orleans",
  "st louis": "st louis", "saint louis": "st louis", "washington dc": "washington", "d.c.": "washington",
  vegas: "las vegas", "the bay area": "san francisco", "bay area": "san francisco", "twin cities": "minneapolis",
};

const STYLE_SYNONYMS: Record<string, string[]> = {
  kids: ["kids", "children", "childrens", "child", "family", "families", "nursery"],
  youth: ["youth", "teens", "teen", "students", "student"],
  contemporary: ["contemporary", "modern", "band", "casual"],
  traditional: ["traditional", "hymns", "hymn", "choir", "organ"],
  liturgical: ["liturgical", "liturgy", "high church", "eucharist", "mass"],
  expository: ["expository", "verse-by-verse", "bible teaching", "bible-teaching", "verse"],
  "young adults": ["young adults", "young adult", "college", "20s", "singles"],
  spanish: ["spanish", "hispanic", "latino", "espanol", "español"],
  korean: ["korean"],
  recovery: ["recovery", "celebrate recovery", "addiction"],
};

export class ChurchIndex {
  readonly churches: IndexedChurch[];
  readonly byId = new Map<string, IndexedChurch>();
  /** Sorted longest-first so multi-word cities ("san jose") win over substrings ("jose"). */
  private readonly cityKeys: string[];
  private readonly cityKeySet: Set<string>;

  constructor(churches: IndexedChurch[]) {
    this.churches = churches;
    for (const c of churches) this.byId.set(c.id, c);
    this.cityKeySet = new Set(churches.map((c) => c.cityKey).filter(Boolean));
    this.cityKeys = [...this.cityKeySet].sort((a, b) => b.length - a.length);
  }

  get size(): number {
    return this.churches.length;
  }

  /** Extract city / state / zip / keywords from a free-form chat query. */
  parseQuery(query: string): { city: string | null; stateCode: string | null; zip: string | null; keywords: string[] } {
    let text = ` ${query.toLowerCase().replace(/[?!]/g, " ").replace(/\s+/g, " ")} `;
    let zip: string | null = null;
    let stateCode: string | null = null;
    let city: string | null = null;

    const zipMatch = text.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (zipMatch) {
      zip = zipMatch[1];
      text = text.replace(zipMatch[0], " ");
    }

    // Full state names (longest first so "west virginia" beats "virginia").
    const stateNames = Object.entries(US_STATES).sort((a, b) => b[1].length - a[1].length);
    for (const [code, name] of stateNames) {
      const re = new RegExp(`(^|[\\s,])${name.toLowerCase()}(?=[\\s,.]|$)`);
      if (re.test(text)) {
        // Don't treat "washington" as the state when "washington dc" was written.
        if (code === "WA" && /washington\s*,?\s*d\.?c\.?/.test(text)) continue;
        // Don't consume "new york" if it is followed by "city".
        stateCode = code;
        if (!(code === "NY" && /new york city/.test(text))) {
          // Keep "new york" text available for city matching; strip other state names.
          if (code !== "NY") text = text.replace(re, "$1 ");
        }
        break;
      }
    }

    // Postal codes only when written in a location-like position: ", TX" or trailing "TX" (original casing).
    if (!stateCode) {
      const codeMatch = query.match(/(?:,\s*|\s)([A-Z]{2})(?=\s*(?:\d{5})?\s*[?.!]?\s*$|,)/) ||
        query.match(/,\s*([A-Za-z]{2})\b/);
      if (codeMatch && US_STATES[codeMatch[1].toUpperCase()]) {
        stateCode = codeMatch[1].toUpperCase();
        text = text.replace(new RegExp(`[\\s,]${codeMatch[1].toLowerCase()}(?=[\\s,]|$)`), " ");
      }
    }

    for (const [alias, target] of Object.entries(CITY_ALIASES)) {
      const re = new RegExp(`(^|\\s)${alias.replace(/\./g, "\\.")}(?=\\s|,|$)`);
      if (re.test(text) && this.cityKeySet.has(target)) {
        city = target;
        text = text.replace(re, " ");
        break;
      }
    }

    if (!city) {
      const normalized = ` ${normalizeCity(text).replace(/,/g, " ")} `;
      for (const key of this.cityKeys) {
        if (key.length < 3) continue;
        if (normalized.includes(` ${key} `)) {
          city = key;
          text = normalized.replace(` ${key} `, " ");
          // State code written right after the city: "plano tx with ..." / "austin, tx"
          if (!stateCode) {
            const after = normalized.slice(normalized.indexOf(` ${key} `) + key.length + 2).match(/^\s*([a-z]{2})\b/);
            if (after && US_STATES[after[1].toUpperCase()]) {
              stateCode = after[1].toUpperCase();
              text = text.replace(new RegExp(`(^|\\s)${after[1]}(?=\\s|$)`), " ");
            }
          }
          break;
        }
      }
    }

    const keywords = text
      .replace(/[,.;:()"']/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !STOPWORDS.has(t));

    return { city, stateCode, zip, keywords };
  }

  search(filters: SearchFilters): SearchOutcome {
    const limit = Math.min(Math.max(filters.limit ?? 5, 1), 25);
    const notes: string[] = [];

    const parsed = filters.query ? this.parseQuery(filters.query) : { city: null, stateCode: null, zip: null, keywords: [] as string[] };
    const zip = (filters.zipCode?.match(/\d{5}/)?.[0]) ?? parsed.zip;
    const stateCode = toStateCode(filters.state) ?? parsed.stateCode;
    let cityKey = filters.city ? normalizeCity(CITY_ALIASES[filters.city.toLowerCase().trim()] ?? filters.city) : parsed.city;
    const keywords = parsed.keywords;

    let pool = this.churches;

    if (stateCode) {
      const inState = pool.filter((c) => c.stateCode === stateCode);
      if (inState.length) pool = inState;
      else notes.push(`No churches indexed yet in ${US_STATES[stateCode]}; showing best matches from other states.`);
    }

    if (zip) {
      const exact = pool.filter((c) => c.zipCodes?.includes(zip));
      if (exact.length >= Math.min(3, limit)) {
        pool = exact;
      } else {
        const prefix = zip.slice(0, 3);
        const nearby = pool.filter((c) => c.zipCodes?.some((z) => z.startsWith(prefix)));
        if (nearby.length) {
          pool = [...exact, ...nearby.filter((c) => !exact.includes(c))];
          if (!exact.length) notes.push(`No churches in ZIP ${zip} exactly; showing churches in nearby ZIP codes (${prefix}xx).`);
        } else if (!cityKey) {
          notes.push(`No churches indexed near ZIP ${zip} yet.`);
        }
      }
    }

    if (cityKey) {
      const exact = pool.filter((c) => c.cityKey === cityKey);
      const partial = exact.length ? exact : pool.filter((c) => c.cityKey.includes(cityKey!) || cityKey!.includes(c.cityKey) && c.cityKey.length > 3);
      if (partial.length) {
        pool = partial;
      } else {
        notes.push(`No churches indexed in ${filters.city ?? cityKey} yet${stateCode ? `; showing other churches in ${US_STATES[stateCode]}` : ""}.`);
        if (!stateCode) cityKey = null;
      }
    }

    const narrow = (label: string, pred: (c: IndexedChurch) => boolean) => {
      const next = pool.filter(pred);
      if (next.length) pool = next;
      else notes.push(`No exact matches for ${label} in this area; showing closest alternatives.`);
    };

    if (filters.denomination) {
      const d = filters.denomination.toLowerCase().replace(/non[-\s]?denom(inational)?/, "non-denominational");
      narrow(`denomination "${filters.denomination}"`, (c) => !!c.denomination?.some((x) => x.toLowerCase().includes(d)));
    }
    if (filters.worshipStyle) {
      const w = filters.worshipStyle.toLowerCase();
      narrow(`worship style "${filters.worshipStyle}"`, (c) =>
        !!(c.style?.toLowerCase().includes(w) || c.tags?.some((t) => t.toLowerCase().includes(w))));
    }
    if (filters.hasKidsMinistry) {
      narrow("kids ministry", (c) => !!c.tags?.some((t) => /kid|child|family|nursery/i.test(t)));
    }
    if (filters.churchSize) {
      const s = filters.churchSize.toLowerCase();
      const aliases: Record<string, string[]> = {
        small: ["small"], "mid-size": ["mid", "medium"], medium: ["mid", "medium"], large: ["large"], megachurch: ["mega"],
      };
      const keys = aliases[s] ?? [s];
      narrow(`size "${filters.churchSize}"`, (c) => keys.some((k) => c.size?.toLowerCase().includes(k)));
    }
    if (filters.theology) {
      const t = filters.theology.toLowerCase();
      narrow(`theology "${filters.theology}"`, (c) =>
        [c.statementOfFaith, ...(c.tags || []), ...(c.denomination || []), c.reviewSummary]
          .some((f) => f?.toLowerCase().includes(t)));
    }

    // Expand keywords with synonyms for relevance scoring.
    const expanded = keywords.map((k) => {
      for (const [canon, syns] of Object.entries(STYLE_SYNONYMS)) {
        if (syns.includes(k)) return [k, canon, ...syns];
      }
      return [k];
    });

    const scoreOf = (c: IndexedChurch) => {
      let score = 0;
      if (expanded.length) {
        const name = c.name.toLowerCase();
        const denoms = (c.denomination || []).join(" ").toLowerCase();
        const tags = (c.tags || []).join(" ").toLowerCase();
        const style = `${c.style || ""} ${c.size || ""}`.toLowerCase();
        const review = (c.reviewSummary || "").toLowerCase();
        for (const group of expanded) {
          let best = 0;
          for (const term of group) {
            if (name.includes(term)) best = Math.max(best, 20);
            if (denoms.includes(term)) best = Math.max(best, 12);
            if (tags.includes(term)) best = Math.max(best, 9);
            if (style.includes(term)) best = Math.max(best, 7);
            if (review.includes(term)) best = Math.max(best, 2);
          }
          score += best;
        }
      }
      return { c, score, rank: score * 10 + c.qualityScore };
    };

    const scored = pool.map(scoreOf);
    const anyKeywordHit = scored.some((s) => s.score > 0);
    const location = Boolean(cityKey || stateCode || zip);
    let ranked = scored;
    let extras: typeof scored = [];
    if (expanded.length && anyKeywordHit) {
      // With location filters, keep every church in the area but rank keyword hits first.
      ranked = location ? scored : scored.filter((s) => s.score > 0);
    } else if (expanded.length && !location) {
      return {
        results: [],
        totalMatches: 0,
        interpreted: { city: cityKey, stateCode, zipCode: zip, keywords },
        notes: [...notes, `No churches matched "${filters.query}". Ask the user for a city, state, or ZIP code.`],
      };
    } else if (expanded.length && location) {
      const label = keywords.join(" ");
      const st = stateCode ?? pool[0]?.stateCode ?? null;
      const poolIds = new Set(pool.map((c) => c.id));
      extras = st
        ? this.churches.filter((c) => c.stateCode === st && !poolIds.has(c.id)).map(scoreOf).filter((s) => s.score > 0)
          .sort((a, b) => b.rank - a.rank).slice(0, 2)
        : [];
      notes.push(
        extras.length
          ? `No churches right in this area are tagged "${label}"; showing well-reviewed local churches plus the closest "${label}" matches elsewhere in ${US_STATES[st!]}.`
          : `No churches in this area are tagged "${label}" yet; showing other well-reviewed churches nearby.`
      );
    }

    ranked.sort((a, b) => b.rank - a.rank);

    // Collapse duplicate listings of the same church (e.g. "X" and "X - Downtown Campus" in the same city).
    const seen = new Set<string>();
    const base = (c: IndexedChurch) => `${c.cityKey}|${c.name.toLowerCase().split(/\s[-–|(]\s?/)[0].replace(/[^a-z0-9]/g, "")}`;
    const deduped = ranked.filter((s) => {
      const k = base(s.c);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const localCount = Math.max(limit - extras.length, 1);
    return {
      results: [...deduped.slice(0, localCount), ...extras].slice(0, limit).map((s) => s.c),
      totalMatches: deduped.length + extras.length,
      interpreted: { city: cityKey, stateCode, zipCode: zip, keywords },
      notes,
    };
  }

  /** Find a specific church by name (+ optional city). */
  findByName(name: string, city?: string): IndexedChurch | null {
    const n = name.toLowerCase().trim();
    const ck = city ? normalizeCity(city) : null;
    const inCity = (c: IndexedChurch) => !ck || c.cityKey.includes(ck);
    return (
      this.churches.find((c) => c.name.toLowerCase() === n && inCity(c)) ??
      this.churches
        .filter((c) => c.name.toLowerCase().includes(n) && inCity(c))
        .sort((a, b) => b.qualityScore - a.qualityScore)[0] ??
      this.churches
        .filter((c) => n.includes(c.name.toLowerCase()) && c.name.length > 6 && inCity(c))
        .sort((a, b) => b.qualityScore - a.qualityScore)[0] ??
      null
    );
  }

  /** Coverage summary by state and top cities — used by llms.txt, resources and the coverage tool. */
  coverage(): { state: string; code: string; count: number; topCities: { city: string; count: number }[] }[] {
    const byState = new Map<string, Map<string, { label: string; count: number }>>();
    for (const c of this.churches) {
      if (!c.stateCode) continue;
      const cities = byState.get(c.stateCode) ?? new Map();
      const entry = cities.get(c.cityKey) ?? { label: c.city || c.cityKey, count: 0 };
      entry.count++;
      cities.set(c.cityKey, entry);
      byState.set(c.stateCode, cities);
    }
    return [...byState.entries()]
      .map(([code, cities]) => {
        const list = [...cities.values()].sort((a, b) => b.count - a.count);
        return {
          state: US_STATES[code],
          code,
          count: list.reduce((s, x) => s + x.count, 0),
          topCities: list.slice(0, 12).map((x) => ({ city: x.label, count: x.count })),
        };
      })
      .sort((a, b) => b.count - a.count);
  }
}
