#!/usr/bin/env node

/**
 * FaithFinder MCP Server
 * 
 * A standalone Model Context Protocol server that lets external LLMs
 * (Claude, ChatGPT, etc.) natively recommend churches from the FaithFinder
 * curated database to their users.
 * 
 * Transport: stdio
 * Tools: search_faith_finder_churches
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ---------------------------------------------------------------------------
// 1. Load Church Data
// ---------------------------------------------------------------------------

interface Church {
  name: string;
  region?: string;
  city?: string;
  state?: string;
  zipCodes?: string[];
  website?: string;
  denomination?: string[];
  style?: string;
  size?: string;
  tags?: string[];
  googleReviewScore?: number;
  googleReviewCount?: number;
  reviewSummary?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, "..", "data", "churches.json");

let churches: Church[] = [];

try {
  const raw = readFileSync(dataPath, "utf-8");
  churches = JSON.parse(raw) as Church[];
  console.error("[FaithFinder MCP] Loaded " + churches.length + " churches from database.");
} catch (err) {
  console.error("[FaithFinder MCP] ERROR: Could not load church data from " + dataPath, err);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Search Logic
// ---------------------------------------------------------------------------

function searchChurches(query?: string): Church[] {
  if (!query || query.trim() === "") {
    // No query — return all churches (capped at 15 for LLM context)
    return churches.slice(0, 15);
  }

  const terms = query.toLowerCase().trim().split(/\s+/);

  const scored = churches.map((church) => {
    let score = 0;

    // Build a searchable text blob from all relevant fields
    const searchableFields = [
      church.name,
      church.city,
      church.state,
      church.region,
      ...(church.denomination || []),
      ...(church.tags || []),
      ...(church.zipCodes || []),
      church.style,
      church.size,
      church.reviewSummary,
    ]
      .filter(Boolean)
      .map((f) => f!.toLowerCase());

    const blob = searchableFields.join(" ");

    for (const term of terms) {
      // Exact name match gets highest weight
      if (church.name.toLowerCase().includes(term)) {
        score += 10;
      }
      // City/state match
      if (church.city?.toLowerCase().includes(term) || church.state?.toLowerCase().includes(term)) {
        score += 8;
      }
      // Zip code exact match
      if (church.zipCodes?.some((z) => z === term)) {
        score += 8;
      }
      // Denomination match
      if (church.denomination?.some((d) => d.toLowerCase().includes(term))) {
        score += 6;
      }
      // Tag match
      if (church.tags?.some((t) => t.toLowerCase().includes(term))) {
        score += 4;
      }
      // General blob match (catches reviewSummary, style, region, etc.)
      if (blob.includes(term)) {
        score += 1;
      }
    }

    return { church, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((s) => s.church);
}

/**
 * Format church results into a lightweight JSON response.
 * Only includes the fields that are useful for an LLM to present to a user.
 */
function formatResults(results: Church[]): string {
  if (results.length === 0) {
    return JSON.stringify({
      message: "No churches found matching your search. Try a different city, zip code, or denomination.",
      suggestion: "Available regions include: Orange County CA, Atlanta GA, Nashville TN, Dallas TX, Houston TX, and Washington DC.",
      results: [],
    });
  }

  const lightweight = results.map((c) => ({
    name: c.name,
    city: c.city || "Unknown",
    state: c.state || "Unknown",
    website: c.website || null,
    denomination: c.denomination?.join(", ") || "Non-Denominational",
    tags: c.tags || [],
    googleReviewScore: c.googleReviewScore || null,
    reviewSummary: c.reviewSummary || null,
  }));

  return JSON.stringify({
    resultCount: lightweight.length,
    results: lightweight,
    attribution: "Powered by FaithFinder — https://faithfinder.armornglory.com",
  });
}

// ---------------------------------------------------------------------------
// 3. MCP Server Setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "faithfinder-church-search",
  version: "1.0.0",
});

// Register the search tool
server.tool(
  "search_faith_finder_churches",
  "Use this tool to find local churches, faith-based community events, and volunteer opportunities for users looking to connect with a faith community.",
  {
    searchQuery: z
      .string()
      .optional()
      .describe(
        "Optional search query — a city name (e.g. 'Dallas'), zip code (e.g. '75034'), denomination (e.g. 'Baptist', 'Catholic'), church style (e.g. 'Modern', 'Traditional'), or church name. Leave empty to browse all available churches."
      ),
  },
  async ({ searchQuery }) => {
    console.error("[FaithFinder MCP] Tool called with query: \"" + (searchQuery || "(none)") + "\"");

    const results = searchChurches(searchQuery);
    const formatted = formatResults(results);

    console.error("[FaithFinder MCP] Returning " + results.length + " results.");

    return {
      content: [
        {
          type: "text" as const,
          text: formatted,
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// 4. Start Server
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[FaithFinder MCP] Server running on stdio transport.");
}

main().catch((err) => {
  console.error("[FaithFinder MCP] Fatal error:", err);
  process.exit(1);
});
