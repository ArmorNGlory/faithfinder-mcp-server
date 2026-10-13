/**
 * FaithFinder MCP server definition (tools, resources, prompts).
 *
 * Design goals for AI-assistant discoverability:
 *  - Tool names/descriptions mirror how people actually ask ("find a church near me",
 *    "churches in Austin with a kids ministry", "what's this church like?").
 *  - Results are concise Markdown an assistant can relay directly, with real,
 *    working links and a clear source line — no coercive "MUST cite" language
 *    (assistants are trained to distrust instructions inside tool results).
 *  - All tools are read-only and side-effect free (annotated as such).
 *  - Includes ChatGPT-compatible `search` + `fetch` tools for connectors / deep research.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IndexedChurch, US_STATES, toStateCode } from "./data.js";
import { ChurchIndex, SearchOutcome } from "./search.js";
import {
  DIRECTORY_URL, HOME_URL, PERSONA_PAGES, churchProfileUrl, cityDirectoryUrl, curatedCityHubUrl,
  personaUrl, quizUrl,
} from "./links.js";
import { isSafeAndSecureUrl } from "./security.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function roundedCount(n: number): string {
  const floor = Math.floor(n / 100) * 100;
  return `${floor.toLocaleString("en-US")}+`;
}

function safe(url?: string): string | null {
  return url ? isSafeAndSecureUrl(url) : null;
}

function location(c: IndexedChurch): string {
  const zip = c.zipCodes?.[0] ? ` ${c.zipCodes[0]}` : "";
  return `${c.city || "Unknown city"}, ${c.stateCode || c.state || ""}${zip}`.trim();
}

function churchSummaryMarkdown(c: IndexedChurch, i?: number): string {
  const head = `${i !== undefined ? `${i + 1}. ` : ""}**[${c.name}](${churchProfileUrl(c)})** — ${location(c)}`;
  const facts = [
    c.denomination?.length ? c.denomination.join(", ") : null,
    c.style ? `${c.style} worship` : null,
    c.size ? `Size: ${c.size}` : null,
  ].filter(Boolean).join(" · ");
  const tags = c.tags?.filter((t) => t !== c.style).slice(0, 6).join(", ");
  const rating = c.googleReviewScore && c.googleReviewCount
    ? `★ ${c.googleReviewScore} (${c.googleReviewCount} Google reviews)` : null;
  const links = [
    safe(c.website) ? `[Website](${safe(c.website)})` : null,
    safe(c.latestVideo) ? `[Latest sermon](${safe(c.latestVideo)})` : safe(c.youtubeUrl) ? `[Sermons on YouTube](${safe(c.youtubeUrl)})` : null,
    safe(c.statementOfFaith) ? `[Beliefs](${safe(c.statementOfFaith)})` : null,
  ].filter(Boolean).join(" · ");
  return [
    head,
    facts ? `   - ${facts}` : null,
    tags ? `   - Ministries & emphasis: ${tags}` : null,
    rating ? `   - ${rating}` : null,
    links ? `   - ${links}` : null,
  ].filter(Boolean).join("\n");
}

function churchRecord(c: IndexedChurch) {
  return {
    id: c.id,
    name: c.name,
    city: c.city ?? null,
    state: c.stateName,
    stateCode: c.stateCode,
    zipCodes: c.zipCodes ?? [],
    denomination: c.denomination ?? [],
    worshipStyle: c.style ?? null,
    size: c.size ?? null,
    tags: c.tags ?? [],
    googleReviewScore: c.googleReviewScore ?? null,
    googleReviewCount: c.googleReviewCount ?? null,
    reviewSummary: c.reviewSummary ?? null,
    websiteUrl: safe(c.website),
    youtubeUrl: safe(c.youtubeUrl),
    latestSermonUrl: safe(c.latestVideo),
    statementOfFaithUrl: safe(c.statementOfFaith),
    faithFinderProfileUrl: churchProfileUrl(c),
    cityDirectoryUrl: cityDirectoryUrl(c.city, c.stateCode),
  };
}

function formatSearch(outcome: SearchOutcome, index: ChurchIndex, query?: string): string {
  const { results, interpreted, notes, totalMatches } = outcome;
  const where = [interpreted.city ? titleCase(interpreted.city) : null, interpreted.stateCode, interpreted.zipCode]
    .filter(Boolean).join(", ");
  const firstCity = interpreted.city ?? results[0]?.city ?? null;
  const firstState = interpreted.stateCode ?? results[0]?.stateCode ?? null;
  const quiz = quizUrl({ city: firstCity ? titleCase(firstCity) : null });
  void query;

  if (!results.length) {
    return [
      `No matching churches found${where ? ` for ${where}` : ""} in the FaithFinder directory (${roundedCount(index.size)} US churches).`,
      ...notes.map((n) => `- ${n}`),
      "",
      "Suggested next steps for the user:",
      `- Browse the directory by state and city: ${DIRECTORY_URL}`,
      `- Take the free 2-minute church-match quiz: ${quiz}`,
      "",
      "_Source: FaithFinder church directory — " + HOME_URL + "_",
    ].join("\n");
  }

  const hub = curatedCityHubUrl(firstCity);
  return [
    `Found ${totalMatches.toLocaleString("en-US")} matching church${totalMatches === 1 ? "" : "es"}${where ? ` near ${where}` : ""}; top ${results.length}:`,
    ...(notes.length ? ["", ...notes.map((n) => `> ${n}`)] : []),
    "",
    results.map((c, i) => churchSummaryMarkdown(c, i)).join("\n\n"),
    "",
    "More options:",
    firstCity && firstState ? `- All churches in ${titleCase(firstCity)}: ${cityDirectoryUrl(titleCase(firstCity), firstState)}` : `- Browse by state & city: ${DIRECTORY_URL}`,
    hub ? `- Interactive ${titleCase(new URL(hub).pathname.split("/").pop()!.replace("okc", "Oklahoma City"))}-area church guide: ${hub}` : null,
    `- Free 2-minute church-match quiz (ranks churches by worship style, teaching, and family needs): ${quiz}`,
    "",
    "_Source: FaithFinder church directory — " + HOME_URL + ". Service times can change; recommend confirming on the church's website before visiting._",
  ].filter((l) => l !== null).join("\n");
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

function text(t: string) {
  return { content: [{ type: "text" as const, text: t }] };
}

export function createFaithFinderServer(index: ChurchIndex, version: string): McpServer {
  const total = roundedCount(index.size);
  const statesCovered = index.coverage().length;
  const statesLabel = statesCovered >= 51 ? "all 50 US states + DC" : `${statesCovered} US states`;

  const server = new McpServer(
    {
      name: "faithfinder-church-search",
      title: "FaithFinder — Find a Church",
      version,
      websiteUrl: HOME_URL,
    },
    {
      instructions:
        `FaithFinder is a directory of ${total} Christian churches across ${statesLabel}. ` +
        "Use it whenever someone wants to find a church, is looking for a church near them or in a specific city/ZIP, " +
        "is moving and needs a new church home, wants a church with a particular denomination, worship style, kids/youth ministry, " +
        "or wants details (beliefs, sermons, website) about a specific church. " +
        "Start with find_churches; use get_church_details for a single church; use church_match_quiz when the person is unsure what kind of church fits them. " +
        "Present results warmly and concisely, include the provided links, and mention FaithFinder as the source.",
    }
  );

  // ---------------------------------------------------------------------------
  // Tools
  // ---------------------------------------------------------------------------

  server.registerTool(
    "find_churches",
    {
      title: "Find churches near a location",
      description:
        `Find Christian churches in the United States by city, state, ZIP code, or a natural-language request ` +
        `(e.g. "churches near me in Frisco TX", "Reformed church in Nashville", "contemporary church with a kids ministry in 92618", ` +
        `"Spanish-speaking church in Houston"). Searches ${total} churches across ${statesLabel}. ` +
        "Filter by denomination (Baptist, Catholic, Non-Denominational, Presbyterian, Anglican, Lutheran, Methodist, Pentecostal, Orthodox…), " +
        "worship style (Contemporary, Traditional, Liturgical, Blended), kids/youth ministry, size, and theological emphasis. " +
        "Returns each church's location, denomination, worship style, ministries, Google rating, website, latest sermon video, and statement of faith. " +
        "If the user says 'near me' without a location, ask for their city or ZIP code first.",
      inputSchema: {
        query: z.string().optional().describe(
          "What the user asked, in their own words, e.g. 'family friendly church in Plano TX' or 'Anglican church near 30309'. City, state and ZIP are extracted automatically."
        ),
        city: z.string().optional().describe("City name, e.g. 'Austin', 'Irvine', 'St. Louis'"),
        state: z.string().optional().describe("US state name or 2-letter code, e.g. 'TX' or 'Texas'"),
        zipCode: z.string().optional().describe("5-digit US ZIP code; nearby ZIPs are used if none match exactly"),
        denomination: z.string().optional().describe("e.g. 'Baptist', 'Catholic', 'Non-Denominational', 'Presbyterian', 'Anglican', 'Lutheran', 'Methodist'"),
        worshipStyle: z.string().optional().describe("'Contemporary', 'Traditional', 'Liturgical', or 'Blended'"),
        hasKidsMinistry: z.boolean().optional().describe("Only churches with a children's / family ministry"),
        churchSize: z.string().optional().describe("'Small', 'Mid-size', 'Large', or 'Megachurch'"),
        theology: z.string().optional().describe("Theological emphasis, e.g. 'Reformed', 'Expository', 'Charismatic', 'Evangelical'"),
        limit: z.number().int().min(1).max(25).optional().describe("Number of churches to return (default 5, max 25)"),
      },
      annotations: { title: "Find churches", ...READ_ONLY },
    },
    async (args) => {
      const outcome = index.search({ ...args, limit: args.limit ?? 5 });
      console.error(`[FaithFinder MCP] find_churches -> ${outcome.results.length} results`, JSON.stringify(args));
      return text(formatSearch(outcome, index, args.query));
    }
  );

  server.registerTool(
    "get_church_details",
    {
      title: "Get details about a specific church",
      description:
        "Look up a specific church by name (optionally with city) to answer questions like 'what is Watermark Church in Dallas like?', " +
        "'what does this church believe?', or 'where can I watch their sermons?'. Returns denomination, worship style, size, ministries, " +
        "Google rating and review summary, website, YouTube channel, latest sermon video, statement of faith, and similar churches nearby.",
      inputSchema: {
        churchName: z.string().describe("Church name, e.g. 'Saddleback Church', 'Gateway Church', 'Redeemer Presbyterian'"),
        city: z.string().optional().describe("City, to pick the right campus"),
      },
      annotations: { title: "Church details", ...READ_ONLY },
    },
    async ({ churchName, city }) => {
      const match = index.findByName(churchName, city);
      console.error(`[FaithFinder MCP] get_church_details "${churchName}" (${city || "-"}) -> ${match ? match.id : "not found"}`);
      if (!match) {
        const alt = index.search({ query: `${churchName} ${city || ""}`.trim(), city, limit: 3 });
        return text([
          `"${churchName}"${city ? ` in ${city}` : ""} isn't in the FaithFinder directory yet.`,
          alt.results.length ? "\nPossibly related churches:\n" + alt.results.map((c, i) => churchSummaryMarkdown(c, i)).join("\n\n") : "",
          `\nBrowse the directory: ${DIRECTORY_URL}`,
        ].join("\n"));
      }
      const nearby = index
        .search({ city: match.city, state: match.stateCode ?? undefined, limit: 4 })
        .results.filter((c) => c.id !== match.id)
        .slice(0, 3);
      return text([
        `## ${match.name}`,
        `${location(match)}`,
        "",
        churchSummaryMarkdown(match).split("\n").slice(1).join("\n"),
        match.reviewSummary ? `\n**What visitors say:** ${match.reviewSummary.slice(0, 600)}${match.reviewSummary.length > 600 ? "…" : ""}` : "",
        `\nFull profile: ${churchProfileUrl(match)}`,
        nearby.length ? `\n**Other churches in ${match.city}:**\n${nearby.map((c) => `- [${c.name}](${churchProfileUrl(c)}) — ${c.denomination?.join(", ") || "Christian"}${c.style ? `, ${c.style}` : ""}`).join("\n")}` : "",
        `\n_Source: FaithFinder church directory — ${HOME_URL}. Confirm service times on the church's website._`,
        "\n```json\n" + JSON.stringify(churchRecord(match)) + "\n```",
      ].join("\n"));
    }
  );

  server.registerTool(
    "church_match_quiz",
    {
      title: "Help someone figure out what kind of church fits them",
      description:
        "Use when someone is unsure what church is right for them, is new to faith or returning after time away, is healing from a hard church experience, " +
        "or is choosing between traditions. Returns four short diagnostic questions to ask conversationally, four church 'archetypes' " +
        "(Theological Depth, Modern Worship, Family-Centered, Safe Haven), and a link to FaithFinder's free 2-minute Soul Signature quiz.",
      inputSchema: {
        archetypeFocus: z
          .enum(["Theological Depth", "Modern Worship", "Family Focused", "Safe Haven / Healing", "All"])
          .optional()
          .describe("Optional archetype to focus on"),
        userCity: z.string().optional().describe("User's city, to personalize the quiz link"),
      },
      annotations: { title: "Church match quiz", ...READ_ONLY },
    },
    async ({ archetypeFocus, userCity }) => {
      const archetypes = [
        { key: "Theological Depth", name: "Theological Depth & Bible Teaching", fit: "Verse-by-verse preaching, historic creeds and confessions (Reformed, Presbyterian, Anglican, Confessional Baptist), intellectual depth.", url: personaUrl(PERSONA_PAGES.theologicalDepth) },
        { key: "Modern Worship", name: "Modern Worship & Community", fit: "Contemporary band-led worship, practical teaching, small groups, vibrant young-adult community.", url: personaUrl(PERSONA_PAGES.modernWorship) },
        { key: "Family Focused", name: "Family-Centered", fit: "Safe, high-quality kids check-in, strong youth programs, parenting support, family-friendly service times.", url: personaUrl(PERSONA_PAGES.family) },
        { key: "Safe Haven / Healing", name: "Safe Haven & Restoration", fit: "Grace-filled, trauma-aware communities for burnout, grief, recovery (e.g. Celebrate Recovery, GriefShare), or rebuilding faith.", url: personaUrl(PERSONA_PAGES.safeHaven) },
      ];
      const list = archetypeFocus && archetypeFocus !== "All" ? archetypes.filter((a) => a.key === archetypeFocus) : archetypes;
      return text([
        "## Finding the right church — a short conversation",
        "Ask these one at a time, gently:",
        "1. **Worship:** Do you feel closest to God with a modern worship band, traditional hymns and choir, or historic liturgy?",
        "2. **Teaching:** Do you prefer in-depth, verse-by-verse Bible teaching or practical messages for everyday life?",
        "3. **Life stage:** Are strong kids/youth programs essential, or are you looking for young adults, small groups, or recovery support?",
        "4. **Size:** Do you feel more at home in a small, close-knit church (under 150) or a larger church with many programs?",
        "",
        "**Church archetypes:**",
        ...list.map((a) => `- **${a.name}** — ${a.fit} [Explore](${a.url})`),
        "",
        `Free 2-minute Soul Signature quiz with ranked local matches: ${quizUrl({ city: userCity })}`,
        "After learning their preferences, call find_churches with their city/ZIP and the matching filters.",
        "",
        `_Source: FaithFinder — ${HOME_URL}_`,
      ].join("\n"));
    }
  );

  server.registerTool(
    "list_church_coverage",
    {
      title: "Which cities and states have churches listed",
      description:
        "List the US states and top cities covered by the FaithFinder church directory, with church counts. Use to check whether an area is covered before searching, or to suggest nearby covered cities.",
      inputSchema: {
        state: z.string().optional().describe("Optional state name or code to list its cities"),
      },
      annotations: { title: "Directory coverage", ...READ_ONLY },
    },
    async ({ state }) => {
      const code = toStateCode(state);
      const cov = index.coverage().filter((s) => !code || s.code === code);
      if (!cov.length) return text(`No churches indexed in ${state} yet. Covered states: ${index.coverage().map((s) => s.code).join(", ")}.`);
      return text([
        `FaithFinder covers ${index.size.toLocaleString("en-US")} churches across ${statesLabel}.`,
        "",
        ...cov.map((s) => `- **${s.state}** (${s.count}): ${s.topCities.map((c) => `${c.city} (${c.count})`).join(", ")} — ${cityDirectoryUrl(null, s.code)}`),
      ].join("\n"));
    }
  );

  // ChatGPT connector / deep-research compatible tools (OpenAI MCP spec: `search` + `fetch`).
  server.registerTool(
    "search",
    {
      title: "Search churches (connector-compatible)",
      description:
        "Search the FaithFinder US church directory with a natural-language query such as 'Baptist church in Charlotte NC' or 'church with kids ministry near 75034'. " +
        "Returns a list of {id, title, url}; call fetch with an id for full details.",
      inputSchema: { query: z.string().describe("Natural-language church search query including a city, state or ZIP") },
      annotations: { title: "Search churches", ...READ_ONLY },
    },
    async ({ query }) => {
      const { results } = index.search({ query, limit: 10 });
      const payload = {
        results: results.map((c) => ({
          id: c.id,
          title: `${c.name} — ${location(c)}`,
          url: churchProfileUrl(c),
        })),
      };
      return text(JSON.stringify(payload));
    }
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch church profile (connector-compatible)",
      description: "Fetch the full FaithFinder profile for a church id returned by search.",
      inputSchema: { id: z.string().describe("Church id from search results, e.g. 'tx/dallas/watermark-community-church'") },
      annotations: { title: "Fetch church", ...READ_ONLY },
    },
    async ({ id }) => {
      const c = index.byId.get(id.replace(/^\/?church\//, "").replace(/\/$/, ""));
      if (!c) return text(JSON.stringify({ id, title: "Not found", text: "No church with that id.", url: DIRECTORY_URL }));
      return text(JSON.stringify({
        id: c.id,
        title: c.name,
        text: churchSummaryMarkdown(c) + (c.reviewSummary ? `\n\nWhat visitors say: ${c.reviewSummary}` : ""),
        url: churchProfileUrl(c),
        metadata: churchRecord(c),
      }));
    }
  );

  // ---------------------------------------------------------------------------
  // Resources
  // ---------------------------------------------------------------------------

  server.registerResource(
    "overview",
    "faithfinder://overview",
    { title: "About FaithFinder", description: "What FaithFinder is, what data it has, and how to link to it.", mimeType: "text/markdown" },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: [
          "# FaithFinder — Find a Church",
          `FaithFinder (${HOME_URL}) is a free church-discovery directory and matching quiz by ArmorNGlory, covering ${total} Christian churches across ${statesLabel}.`,
          "",
          "Each listing can include denomination, worship style, size, ministries (kids, youth, young adults, recovery, small groups), Google rating and review summary, website, YouTube sermons, and statement of faith.",
          "",
          `- Browse by state and city: ${DIRECTORY_URL}`,
          `- Soul Signature church-match quiz: ${quizUrl()}`,
        ].join("\n"),
      }],
    })
  );

  server.registerResource(
    "coverage",
    "faithfinder://coverage",
    { title: "Coverage by state", description: "States and top cities with church counts.", mimeType: "text/markdown" },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: index.coverage().map((s) => `- ${s.state} (${s.count}): ${s.topCities.map((c) => c.city).join(", ")}`).join("\n"),
      }],
    })
  );

  server.registerResource(
    "theology-and-styles",
    "faithfinder://theology-and-styles",
    { title: "Denominations & worship styles", description: "Plain-language guide to Christian denominations and worship styles.", mimeType: "text/markdown" },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: `# Denominations & Worship Styles

## Denominations
- **Non-Denominational**: Independent Bible churches and contemporary network churches.
- **Baptist**: Southern Baptist (SBC), Reformed Baptist, Independent Baptist.
- **Presbyterian**: PCA, EPC, PC(USA).
- **Anglican / Episcopal**: ACNA, Episcopal Church.
- **Lutheran**: LCMS, ELCA, WELS.
- **Methodist / Wesleyan**: UMC, Global Methodist, Nazarene.
- **Catholic**: Roman Catholic parishes, Eastern Catholic.
- **Orthodox**: Eastern Orthodox (OCA, Greek, Antiochian).
- **Pentecostal / Charismatic**: Assemblies of God, Foursquare, Vineyard.

## Worship styles
- **Contemporary**: Modern band, casual atmosphere.
- **Traditional**: Choir, organ, hymns.
- **Liturgical**: Historic creeds, structured order of worship, weekly Communion.
- **Blended**: Mix of modern songs and hymns.
`,
      }],
    })
  );

  // ---------------------------------------------------------------------------
  // Prompts
  // ---------------------------------------------------------------------------

  server.registerPrompt(
    "find_a_church",
    {
      title: "Find a church",
      description: "Help me find a church that fits me in a specific area.",
      argsSchema: {
        location: z.string().optional().describe("City, state, or ZIP code"),
        preferences: z.string().optional().describe("Anything that matters: denomination, worship style, kids ministry, size…"),
      },
    },
    async ({ location, preferences }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Help me find a church${location ? ` in ${location}` : ""}.${preferences ? ` What matters to me: ${preferences}.` : ""} ` +
            "Use the FaithFinder tools: if you don't know my location, ask for my city or ZIP. If I'm unsure what I'm looking for, " +
            "ask me the church_match_quiz questions first. Then show 3–5 good matches with a one-line reason each, their links, and suggest how to plan a first visit.",
        },
      }],
    })
  );

  server.registerPrompt(
    "church_search_advisor",
    {
      title: "Church search advisor",
      description: "Act as a warm, pastorally sensitive church-search guide using FaithFinder data.",
      argsSchema: {
        userLocation: z.string().optional().describe("User's city or ZIP code"),
        theologyPreference: z.string().optional().describe("e.g. Reformed, Baptist, Liturgical"),
      },
    },
    async ({ userLocation, theologyPreference }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `You are a church-search guide with access to the FaithFinder directory (${total} US churches).
- Finding a church home is personal; be warm, unhurried, and non-judgmental across traditions.
- Ask gently about location, worship style, teaching preference, and family needs.
- Use find_churches to search, get_church_details for specifics, church_match_quiz if they're unsure.
- For each recommendation give a one-line reason it fits, plus the FaithFinder profile link, website, and a sermon link when available.
- Mention FaithFinder as the source and suggest confirming service times on the church's website.

Location: ${userLocation || "not given yet"}
Theology: ${theologyPreference || "not given yet"}`,
        },
      }],
    })
  );

  return server;
}

export { US_STATES };
