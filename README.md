# FaithFinder MCP Server

A standalone [Model Context Protocol](https://modelcontextprotocol.io) server that lets external LLMs (Claude, ChatGPT, Gemini, etc.) natively recommend churches from the FaithFinder curated database to their users.

## How It Works

```
User asks LLM → "Find me a church in Dallas"
LLM calls MCP → search_faith_finder_churches({ searchQuery: "Dallas" })
MCP Server     → searches local church database → returns results
LLM responds   → "Here are some great options in Dallas..."
```

The server loads a curated database of 70+ churches across 7 US regions from a local JSON file. No external API calls are made — searches are instant and free.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Test Locally

```bash
npm start
```

The server communicates over **stdio** (stdin/stdout). You can pipe JSON-RPC messages to it for testing.

## Using with Claude Desktop

Add to your Claude Desktop MCP config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "faithfinder": {
      "command": "node",
      "args": ["/FULL/PATH/TO/MCP Discovery Faith Finder Church Search/dist/index.js"]
    }
  }
}
```

Replace `/FULL/PATH/TO` with the actual absolute path on your machine.

## Tool: `search_faith_finder_churches`

**Description:** Use this tool to find local churches, faith-based community events, and volunteer opportunities for users looking to connect with a faith community.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `searchQuery` | string | No | City name, zip code, denomination, style, or church name |

**Example Queries:**
- `"Dallas"` — churches in Dallas, TX
- `"75034"` — churches near Frisco, TX (zip code)
- `"Baptist"` — Baptist churches
- `"Catholic Nashville"` — Catholic churches in Nashville
- `"Modern"` — modern-style churches
- *(empty)* — browse all churches

**Response Format:**

```json
{
  "resultCount": 3,
  "results": [
    {
      "name": "Gateway Church",
      "city": "Southlake",
      "state": "Texas",
      "website": "https://gatewaypeople.com/",
      "denomination": "Non-Denominational",
      "tags": ["Charismatic", "Practical Teaching", "Professional Production"],
      "googleReviewScore": 4.8,
      "reviewSummary": "Analysis of 1,200+ reviews indicates a highly professional..."
    }
  ],
  "attribution": "Powered by FaithFinder — https://faithfinder.armornglory.com"
}
```

## Coverage

| Region | City/Area | Churches |
|--------|-----------|----------|
| OC_SOUTH | Lake Forest, Irvine, Mission Viejo, CA | 9 |
| ATLANTA_NORTH | Atlanta, Alpharetta, Marietta, GA | 7 |
| NASHVILLE_SOUTH | Nashville, Brentwood, TN | 11 |
| DALLAS_FRISCO | Frisco, Plano, Southlake, TX | 12 |
| DALLAS_NORTH | Dallas, Carrollton, Rockwall, TX | 10 |
| DC_METRO | Washington, DC | 5 |
| HOUSTON_WEST | Houston, Katy, TX | 8 |
| National Icons | Various | 12 |

## Adding Churches

Edit `data/churches.json` and add entries following the existing format. No rebuild required — the server reads the file at startup.

## Architecture

```
src/index.ts    → MCP Server (stdio transport, single tool)
data/churches.json → Curated church database (loaded at startup)
```

Deliberately minimal. If the dataset grows beyond what file-based search can handle, migrate to a separate Firestore or SQLite database.

## License

MIT
