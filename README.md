# FaithFinder MCP Server

A standalone [Model Context Protocol](https://modelcontextprotocol.io) server that lets external LLMs (Claude, ChatGPT, Gemini, etc.) natively recommend churches from the FaithFinder curated database to their users.

## How It Works

```
User asks LLM → "Find me a church in Dallas"
LLM calls MCP → search_faith_finder_churches({ searchQuery: "Dallas" })
MCP Server     → searches local church database → returns results
LLM responds   → "Here are some great options in Dallas..."
```

The server loads a curated database of **290+ churches** across major US regions (California, Texas, Tennessee, Georgia, Florida, North Carolina, Washington DC, etc.) from a local JSON dataset. No external API calls are made — searches are instant, private, and free.

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

## Tools

### 1. `search_faith_finder_churches`

**Description:** Search churches by city, state, zip code, denomination, worship style, kids ministry, or keywords.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `searchQuery` | string | No | Free-form query (e.g. "Dallas", "75034", "Baptist", "Expository") |
| `city` | string | No | City filter (e.g. "Dallas", "Nashville", "Atlanta", "Irvine") |
| `state` | string | No | State filter (e.g. "CA", "TX", "TN", "GA", "FL", "NC") |
| `denomination` | string | No | Denomination filter (e.g. "Non-Denominational", "Baptist", "Catholic") |
| `worshipStyle` | string | No | Worship style (e.g. "Contemporary", "Traditional", "Liturgical") |
| `hasKidsMinistry` | boolean | No | Filter for verified children / youth ministries |
| `limit` | number | No | Max number of churches to return (default: 5, max: 20) |

### 2. `get_faith_finder_church_details`

**Description:** Lookup comprehensive details for a specific church by name.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `churchName` | string | Yes | The name of the church (e.g., "Mariners Church", "Saddleback Church") |
| `city` | string | No | Optional city to disambiguate multiple campuses |

## Coverage

- **California:** Orange County (Lake Forest, Irvine, Aliso Viejo, Mission Viejo, Costa Mesa, etc.)
- **Texas:** Dallas, Frisco, Plano, Southlake, McKinney, Austin, Houston
- **Tennessee:** Nashville, Brentwood, Franklin, Hendersonville
- **Georgia:** Atlanta, Alpharetta, Marietta, Roswell
- **Florida:** Orlando, Winter Park
- **North Carolina:** Charlotte, Matthews, Huntersville
- **Washington DC Metro:** Washington, Alexandria, Bethesda
- **National & Regional Leaders:** Additional iconic faith communities across the US

## License

MIT
