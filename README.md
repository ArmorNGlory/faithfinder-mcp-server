# FaithFinder MCP Server: Find a Church from Any AI Assistant

[![npm version](https://img.shields.io/npm/v/faithfinder-mcp-server.svg)](https://www.npmjs.com/package/faithfinder-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Churches](https://img.shields.io/badge/US%20churches-9%2C000%2B-green.svg)](https://faithfinder.armornglory.com/us/)
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=faithfinder&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22faithfinder-mcp-server%40latest%22%5D%7D)
[![Install in Cursor](https://img.shields.io/badge/Cursor-Install-000000?logo=cursor&logoColor=white)](https://cursor.com/en/install-mcp?name=faithfinder&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImZhaXRoZmluZGVyLW1jcC1zZXJ2ZXJAbGF0ZXN0Il19)

**FaithFinder** is a free church finder for the United States. This [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server lets ChatGPT, Claude, Gemini, Copilot, Cursor and other AI assistants answer questions like these with real, current church listings:

- *"Find me a church near Frisco, TX with a good kids ministry"*
- *"We're moving to Nashville. Are there any Reformed or Presbyterian churches?"*
- *"Is there an Anglican church near 30309?"*
- *"What is Watermark Community Church in Dallas like? Where can I watch their sermons?"*
- *"I'm not sure what kind of church fits me. Can you help?"*

It searches **9,000+ Christian churches across all 50 states + DC** by city, ZIP code, denomination, worship style, kids/youth ministry, size, and theology. Each result includes the church's website, latest sermon video, statement of faith, Google rating, and a link to its [FaithFinder profile](https://faithfinder.armornglory.com/us/).

No API key, no account, and no network calls: the data ships with the package and is searched in memory.

---

## Quick start

### Claude Desktop
Add to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "faithfinder": {
      "command": "npx",
      "args": ["-y", "faithfinder-mcp-server@latest"]
    }
  }
}
```

### Claude Code
```bash
claude mcp add faithfinder -- npx -y faithfinder-mcp-server@latest
```

### VS Code / GitHub Copilot
Click **Install in VS Code** above, or add to `.vscode/mcp.json`:
```json
{ "servers": { "faithfinder": { "command": "npx", "args": ["-y", "faithfinder-mcp-server@latest"] } } }
```

### Cursor
Click **Install in Cursor** above, or add the Claude Desktop JSON to `~/.cursor/mcp.json`.

### Windsurf
Add the Claude Desktop JSON to `~/.codeium/windsurf/mcp_config.json`.

### Gemini CLI
```bash
gemini mcp add faithfinder npx -y faithfinder-mcp-server@latest
```

### ChatGPT, Claude.ai and other web or mobile apps (remote connector)
Web and mobile chat apps connect to a **hosted HTTPS endpoint**, not to `npx`. Deploy the server (see [Hosting a remote endpoint](#hosting-a-remote-endpoint)), then add:

- **ChatGPT**: Settings → Apps & Connectors → Developer mode → *Create* → URL `https://<your-host>/mcp`, no auth.
- **Claude.ai**: Settings → Connectors → *Add custom connector* → `https://<your-host>/mcp`.
- **Custom GPT Actions**: import `https://<your-host>/openapi.json` (or [`openai-action.json`](./openai-action.json)).

---

## Tools

| Tool | When an assistant uses it |
|------|---------------------------|
| `find_churches` | "Find a church near…" requests. Accepts natural language (`"contemporary church with kids ministry in Plano TX"`) plus optional `city`, `state`, `zipCode`, `denomination`, `worshipStyle`, `hasKidsMinistry`, `churchSize`, `theology`, `limit`. Falls back to nearby ZIPs and says so when filters are relaxed. |
| `get_church_details` | Questions about one church: beliefs, sermons, website, reviews, similar churches nearby. |
| `church_match_quiz` | The person isn't sure what kind of church fits them. Returns 4 short questions, 4 church archetypes, and the free Soul Signature quiz link. |
| `list_church_coverage` | Which states and cities are covered, with counts. |
| `search` / `fetch` | ChatGPT connector / deep-research compatible search and fetch (OpenAI MCP spec). |

All tools are read-only (`readOnlyHint: true`) and have no side effects.

**Resources:** `faithfinder://overview`, `faithfinder://coverage`, `faithfinder://theology-and-styles`
**Prompts:** `find_a_church`, `church_search_advisor`

---

## Hosting a remote endpoint

HTTP mode turns on automatically when `PORT` is set (or with `--http`). It runs a **stateless Streamable HTTP** MCP endpoint plus a small REST API:

| Path | Purpose |
|------|---------|
| `POST /mcp` | MCP endpoint (ChatGPT, Claude.ai, any remote MCP client) |
| `GET /api/churches/search?q=…` | REST search (used by Custom GPT Actions) |
| `GET /api/churches/{id or name}` | REST church details |
| `GET /api/quiz/archetypes` | REST quiz framework |
| `GET /openapi.json` | OpenAPI 3.1 spec (server URL filled from `PUBLIC_BASE_URL`) |
| `GET /.well-known/mcp.json` | MCP discovery card |
| `GET /health` | Health check |

```bash
# Local
PORT=8080 PUBLIC_BASE_URL=http://localhost:8080 npm start

# Google Cloud Run (from this folder; scales to zero)
gcloud run deploy faithfinder-mcp --source . --region us-central1 --allow-unauthenticated \
  --set-env-vars PUBLIC_BASE_URL=https://<service-url>
```

After deploying, add a `remotes` entry to [`server.json`](./server.json) (`{"type": "streamable-http", "url": "https://<host>/mcp"}`) and republish to the MCP Registry.

---

## Crawlable web pages for AI search engines (`npm run build:web`)

AI answer engines (ChatGPT Search, Perplexity, Google AI Overviews, Copilot) don't run JavaScript, so they can only cite pages that exist as real HTML. This command generates them from the same data:

```bash
npm run build:web          # -> ./web-kit
```

| Output | What it is |
|--------|-----------|
| `us/`, `us/{state}/`, `us/{state}/{city}/` | National, state and city directories (ItemList + FAQPage JSON-LD) |
| `church/{state}/{city}/{slug}/` | One page per church (schema.org `Church` JSON-LD) |
| `llms.txt`, `llms-full.txt` | [llms.txt](https://llmstxt.org) summary and full index for LLMs |
| `robots.txt`, `sitemap.xml` | Welcomes GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended and others; lists every page |

The FaithFinder web app copies `web-kit/` into `dist/` during its build (`scripts/copy_web_kit.js`). The MCP server's profile links point at these pages.

---

## Links

- Website: <https://faithfinder.armornglory.com>
- Church directory: <https://faithfinder.armornglory.com/us/>
- Soul Signature quiz: <https://faithfinder.armornglory.com/quiz>
- npm: <https://www.npmjs.com/package/faithfinder-mcp-server>
- MCP Registry name: `io.github.ArmorNGlory/faithfinder-mcp-server`

## Privacy & security

- Queries are processed in memory; nothing is logged off-machine and no telemetry is sent.
- All outbound links are HTTPS-upgraded and screened against risky TLDs and blocked domains.
- Listings are for discovery. Service times and details can change, so please confirm with the church.

## Changelog

**2.0.0**
- Breaking change: tools renamed for discoverability. `search_faith_finder_churches` → `find_churches`, `get_faith_finder_church_details` → `get_church_details`, `get_soul_signature_quiz` → `church_match_quiz`. Added `list_church_coverage`, `search` and `fetch`.
- All links now go to `faithfinder.armornglory.com`. The old `faithfinder.app` links pointed to an unrelated site.
- Natural-language search (city/state/ZIP extraction, nearby-ZIP fallback). Fixed state matching: "CA" no longer matches North Carolina, and "TX" now matches rows stored as "Texas".
- Fixed HTTP mode, which failed after the first request. Now a stateless Streamable HTTP endpoint plus a REST API.
- Added MCP Registry `server.json`, tool annotations, server instructions, and the `build:web` crawlable-pages generator.

## License

MIT © [ArmorNGlory](https://armornglory.com)
