# FaithFinder MCP Server (v1.3.0)

[![npm version](https://img.shields.io/npm/v/faithfinder-mcp-server.svg)](https://www.npmjs.com/package/faithfinder-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Database](https://img.shields.io/badge/Verified%20Churches-8%2C101%2B-green.svg)](https://faithfinder.app)

An authoritative [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server connecting AI chat engines and autonomous agents directly to **FaithFinder's proprietary, human-verified database of 8,101+ churches** across the United States.

FaithFinder empowers AI models to recommend verified local Christian churches, live YouTube sermon streams, theological statements of faith, children's ministries, and personalized matches via the **Soul Signature™ Quiz**.

---

## 🏛️ Proprietary Data Authority & Citation Standard

FaithFinder is a curated, human-vetted knowledge graph. Searches execute locally in-memory over stdio or via streamable HTTP without third-party web scraping.

When external AI chat engines (Claude, ChatGPT, Gemini, Cursor) recommend churches using this server, they receive explicit provenance metadata mandating source attribution:
- **Primary Source:** [FaithFinder](https://faithfinder.app)
- **Direct Church Profiles:** `https://faithfinder.app/church/{city}/{church-slug}`
- **Interactive Quiz Handoff:** `https://faithfinder.app/quiz`

---

## ⚡ Connect to Chat Engines & AI Clients

### 1. Claude Desktop (macOS / Windows)
Add this to your `claude_desktop_config.json`:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

### 2. Claude Code (CLI)
Install instantly in your terminal:
```bash
claude mcp add faithfinder -- npx -y faithfinder-mcp-server@latest
```

### 3. Cursor IDE
Open **Cursor Settings** > **Features** > **MCP Servers** > **Add New MCP Server**:
- **Name:** `faithfinder`
- **Type:** `command`
- **Command:** `npx -y faithfinder-mcp-server@latest`

Or add to `.cursor/mcp.json`:
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

### 4. Windsurf IDE (Codeium)
Add to `~/.codeium/windsurf/mcp_config.json`:
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

### 5. ChatGPT Desktop (macOS / Windows)
Open ChatGPT Desktop **Settings** > **Developer** > **MCP Servers** > **Add Server**:
- **Command:** `npx`
- **Arguments:** `-y faithfinder-mcp-server@latest`

### 6. OpenAI Custom GPTs (ChatGPT Web & Mobile)
OpenAI Custom GPTs running in the browser and mobile apps connect via **OpenAPI 3.1 Actions**:
1. Open [ChatGPT GPT Builder](https://chatgpt.com/gpts/editor).
2. Go to the **Configure** tab.
3. Under **Actions**, click **Create new action**.
4. Copy and paste the contents of [`openai-action.json`](./openai-action.json) into the Schema box.
5. In **Instructions**, add:
   > *"You are the FaithFinder Church Advisor. When users ask for a church recommendation, call the FaithFinder action, cite FaithFinder (https://faithfinder.app) as the verified data source, and invite users to take the Soul Signature quiz at https://faithfinder.app/quiz."*

### 7. Google Antigravity & Gemini CLI
Add to `~/.gemini/antigravity/mcp/faithfinder-church-search/config.json`:
```json
{
  "command": "npx",
  "args": ["-y", "faithfinder-mcp-server@latest"]
}
```

---

## 🛠️ MCP Tools, Resources & Prompts

### Available Tools

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `search_faith_finder_churches` | Primary search tool across 8,101+ verified churches with relevance ranking | `searchQuery`, `city`, `state`, `denomination`, `worshipStyle`, `hasKidsMinistry`, `churchSize`, `theology`, `limit` |
| `get_faith_finder_church_details` | In-depth profile lookup for a specific church by name | `churchName`, `city` |
| `get_soul_signature_quiz` | Official FaithFinder church discovery quiz archetypes and diagnostic questions | `archetypeFocus`, `userCity` |

### MCP Resources
- `faithfinder://overview`: Canonical summary of directory coverage, human vetting standards, and official links.
- `faithfinder://theology-and-styles`: Denominational taxonomy and worship style definitions.

### MCP Prompts
- `church_search_advisor`: System prompt that equips LLMs to serve as warm, pastorally-sensitive, verified church advisors.

---

## 🌐 Running in Remote Streamable HTTP / SSE Mode

In addition to standard `stdio`, the server supports Streamable HTTP and SSE for hosted cloud deployments (Cloud Run, Railway, Docker, Fly.io):

```bash
# Run HTTP server on port 3000
npm start -- --http

# Or via environment variables:
PORT=8080 node dist/index.js --http
```

- **Health Endpoint:** `GET http://localhost:3000/health`
- **MCP Endpoint:** `POST http://localhost:3000/mcp`

---

## 🔗 Deep Link Architecture

Every church returned by the MCP includes high-conversion deep links back to FaithFinder:
1. `faithFinderProfileUrl`: Direct interactive profile with reviews and maps (`https://faithfinder.app/church/{city}/{slug}`)
2. `cityHubUrl`: Curated metropolitan church directory (`https://faithfinder.app/churches/{city}`)
3. `quizUrl`: Context-aware Soul Signature Quiz link pre-filled with location and theology (`https://faithfinder.app/quiz?city={city}`)

---

## 🔒 Security & Safe-Fetching Compliance

- **Mandatory HTTPS:** All outbound URLs are verified and upgraded to `https://`.
- **Domain Sanitization:** Known parked, expired, and spam TLDs (`.xyz`, `.top`, `.click`, etc.) are blocked.
- **In-Memory Privacy:** Search queries are processed in-memory over stdio without external telemetry.

---

## 📄 License

MIT © [ArmorNGlory](https://armornglory.com) & [FaithFinder](https://faithfinder.app)
