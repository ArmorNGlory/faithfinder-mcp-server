#!/usr/bin/env node

/**
 * FaithFinder MCP Server
 *
 * Connects AI assistants (ChatGPT, Claude, Gemini, Perplexity, Cursor, VS Code,
 * Windsurf, LangChain, …) to the FaithFinder directory of US Christian churches.
 *
 * Transports:
 *   stdio (default)                     npx -y faithfinder-mcp-server
 *   Streamable HTTP (stateless)         node dist/index.js --http   (or set PORT)
 *     POST /mcp                         MCP endpoint (ChatGPT connectors, Claude.ai custom connectors)
 *     GET  /api/churches/search         REST search (matches openai-action.json for Custom GPT Actions)
 *     GET  /api/churches/{id}           REST church details
 *     GET  /api/quiz/archetypes         REST quiz framework
 *     GET  /openapi.json                OpenAPI 3.1 spec
 *     GET  /.well-known/mcp.json        MCP server discovery card
 *     GET  /health                      Health check
 *
 * Tools: find_churches, get_church_details, church_match_quiz, list_church_coverage, search, fetch
 * Resources: faithfinder://overview, faithfinder://coverage, faithfinder://theology-and-styles
 * Prompts: find_a_church, church_search_advisor
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadChurches, readPackageVersion } from "./data.js";
import { ChurchIndex } from "./search.js";
import { createFaithFinderServer, roundedCount } from "./server.js";
import { HOME_URL, REPO_URL, churchProfileUrl, cityDirectoryUrl, quizUrl } from "./links.js";
import { isSafeAndSecureUrl } from "./security.js";

export { isSafeAndSecureUrl } from "./security.js";
export { ChurchIndex } from "./search.js";
export { createFaithFinderServer } from "./server.js";

const VERSION = readPackageVersion();

let index: ChurchIndex;
try {
  index = new ChurchIndex(loadChurches());
  console.error(`[FaithFinder MCP] v${VERSION}: loaded ${index.size} churches.`);
} catch (err) {
  console.error("[FaithFinder MCP] ERROR: could not load church data", err);
  process.exit(1);
}

function restChurch(c: ReturnType<ChurchIndex["search"]>["results"][number]) {
  const safe = (u?: string) => (u ? isSafeAndSecureUrl(u) : null);
  return {
    id: c.id,
    name: c.name,
    city: c.city ?? null,
    state: c.stateName,
    stateCode: c.stateCode,
    zipCodes: c.zipCodes ?? [],
    denomination: c.denomination?.join(", ") ?? null,
    style: c.style ?? null,
    size: c.size ?? null,
    tags: c.tags ?? [],
    websiteUrl: safe(c.website),
    youtubeUrl: safe(c.youtubeUrl),
    latestVideoUrl: safe(c.latestVideo),
    statementOfFaithUrl: safe(c.statementOfFaith),
    googleReviewScore: c.googleReviewScore ?? null,
    googleReviewCount: c.googleReviewCount ?? null,
    reviewSummary: c.reviewSummary ?? null,
    faithFinderProfileUrl: churchProfileUrl(c),
    cityHubUrl: cityDirectoryUrl(c.city, c.stateCode),
  };
}

async function main() {
  const isHttp = process.argv.includes("--http") || Boolean(process.env.MCP_HTTP_PORT || process.env.PORT);

  if (!isHttp) {
    const server = createFaithFinderServer(index, VERSION);
    await server.connect(new StdioServerTransport());
    console.error("[FaithFinder MCP] running on stdio.");
    return;
  }

  const port = Number(process.env.MCP_HTTP_PORT || process.env.PORT || 3000);
  const { createServer } = await import("node:http");
  const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const publicBase = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");

  const json = (res: import("node:http").ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  };

  const readBody = (req: import("node:http").IncomingMessage): Promise<unknown> =>
    new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
        if (data.length > 1_000_000) reject(new Error("Body too large"));
      });
      req.on("end", () => {
        try { resolve(data ? JSON.parse(data) : undefined); } catch (e) { reject(e); }
      });
      req.on("error", reject);
    });

  const httpServer = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    if (req.method === "OPTIONS") return void res.writeHead(204).end();

    const url = new URL(req.url || "/", "http://internal");
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (path === "/mcp" || path === "/message") {
        if (req.method !== "POST") {
          // Stateless server: no standalone SSE stream / session deletion.
          res.writeHead(405, { Allow: "POST", "Content-Type": "application/json" });
          return void res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. Use POST." }, id: null }));
        }
        // Fresh server + transport per request (stateless mode) — safe for concurrent clients.
        const server = createFaithFinderServer(index, VERSION);
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        res.on("close", () => { transport.close(); server.close(); });
        await server.connect(transport);
        await transport.handleRequest(req, res, await readBody(req));
        return;
      }

      if (path === "/" || path === "/health") {
        return json(res, 200, {
          status: "healthy",
          name: "faithfinder-church-search",
          version: VERSION,
          churches: index.size,
          site: HOME_URL,
          mcpEndpoint: "/mcp",
          repository: REPO_URL,
        });
      }

      if (path === "/.well-known/mcp.json" || path === "/.well-known/mcp/server-card.json") {
        return json(res, 200, {
          name: "faithfinder-church-search",
          title: "FaithFinder — Find a Church",
          description: `Find Christian churches across the US (${roundedCount(index.size)}) by city, ZIP, denomination, worship style and kids ministry.`,
          version: VERSION,
          websiteUrl: HOME_URL,
          repository: REPO_URL,
          transport: { type: "streamable-http", url: `${publicBase}/mcp` },
          tools: ["find_churches", "get_church_details", "church_match_quiz", "list_church_coverage", "search", "fetch"],
          authentication: { required: false },
        });
      }

      if (path === "/openapi.json") {
        const spec = JSON.parse(readFileSync(join(projectRoot, "openai-action.json"), "utf-8"));
        if (publicBase) spec.servers = [{ url: `${publicBase}/api`, description: "FaithFinder API" }];
        return json(res, 200, spec);
      }

      if (req.method === "GET" && path === "/api/churches/search") {
        const p = url.searchParams;
        const outcome = index.search({
          query: p.get("q") ?? undefined,
          city: p.get("city") ?? undefined,
          state: p.get("state") ?? undefined,
          zipCode: p.get("zip") ?? undefined,
          denomination: p.get("denomination") ?? undefined,
          worshipStyle: p.get("worshipStyle") ?? undefined,
          hasKidsMinistry: p.get("hasKidsMinistry") === "true" || undefined,
          limit: Number(p.get("limit")) || 5,
        });
        const firstCity = outcome.interpreted.city ?? outcome.results[0]?.city ?? null;
        return json(res, 200, {
          source: { name: "FaithFinder", url: HOME_URL, totalChurches: index.size },
          totalMatches: outcome.totalMatches,
          notes: outcome.notes,
          results: outcome.results.map(restChurch),
          links: {
            quizUrl: quizUrl({ city: firstCity, focus: p.get("q") }),
            cityHubUrl: cityDirectoryUrl(firstCity, outcome.interpreted.stateCode ?? outcome.results[0]?.stateCode),
          },
        });
      }

      if (req.method === "GET" && path === "/api/quiz/archetypes") {
        return json(res, 200, {
          quizUrl: quizUrl({ city: url.searchParams.get("city") }),
          archetypes: ["Theological Depth", "Modern Worship", "Family-Centered", "Safe Haven"],
          questions: [
            "Do you feel closest to God with a modern worship band, traditional hymns, or historic liturgy?",
            "Do you prefer verse-by-verse Bible teaching or practical messages for everyday life?",
            "Are kids/youth programs essential, or are you looking for young adults, small groups, or recovery support?",
            "Do you prefer a small close-knit church or a larger church with many programs?",
          ],
        });
      }

      if (req.method === "GET" && path.startsWith("/api/churches/")) {
        const key = decodeURIComponent(path.slice("/api/churches/".length));
        const c = index.byId.get(key) ?? index.findByName(key, url.searchParams.get("city") ?? undefined);
        if (!c) return json(res, 404, { found: false, message: `Church "${key}" not found.` });
        return json(res, 200, { found: true, church: restChurch(c), source: { name: "FaithFinder", url: HOME_URL } });
      }

      json(res, 404, { error: "Not found. MCP endpoint is POST /mcp; REST API under /api; health at /health." });
    } catch (err) {
      console.error("[FaithFinder MCP] HTTP error", err);
      if (!res.headersSent) json(res, 500, { error: "Internal server error" });
    }
  });

  httpServer.listen(port, () => {
    console.error(`[FaithFinder MCP] HTTP listening on :${port} (MCP: POST /mcp, REST: /api, health: /health)`);
  });
}

main().catch((err) => {
  console.error("[FaithFinder MCP] Fatal error:", err);
  process.exit(1);
});
