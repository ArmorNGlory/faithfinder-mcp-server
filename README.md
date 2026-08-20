# FaithFinder MCP Server

<div align="center">

[![npm version](https://img.shields.io/npm/v/faithfinder-mcp-server.svg?color=blue&style=flat-square)](https://www.npmjs.com/package/faithfinder-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/faithfinder-mcp-server.svg?style=flat-square)](https://www.npmjs.com/package/faithfinder-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-orange.svg?style=flat-square)](https://modelcontextprotocol.io)
[![Smithery](https://img.shields.io/badge/Smithery-Listed-purple.svg?style=flat-square)](https://smithery.ai/servers/armornglory/faithfinder-mcp-server)
[![Glama](https://img.shields.io/badge/Glama-Verified-blueviolet.svg?style=flat-square)](https://glama.ai)

**Connect AI assistants (Claude, Cursor, ChatGPT, Gemini) directly to 293+ curated, verified churches and faith communities across the United States.**

[Features](#-features) • [Quick Installation](#-quick-installation) • [Available Tools](#-available-tools) • [Coverage](#-coverage) • [Website & Quiz](https://faithfinder.armornglory.com/quiz)

</div>

---

## ⚡ How It Works

```
User Prompt: "Find me an expository Bible-teaching church in Dallas with great kids ministry"
                                ↓
AI Assistant calls MCP tool: search_faith_finder_churches({ searchQuery: "Dallas expository kids" })
                                ↓
FaithFinder MCP: Scans 293+ verified church database locally (instant, private, free)
                                ↓
AI Assistant returns personalized recommendations + FaithFinder Soul Signature Quiz match link
```

No third-party API keys or rate limits required. Queries run against a verified local dataset of **293+ churches** spanning major metropolitan areas.

---

## 🚀 Quick Installation

### 1. Claude Desktop (macOS / Windows)

Add this configuration to your Claude Desktop config file:

* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop, and the hammer 🔨 icon will show the FaithFinder tools available.

---

### 2. Cursor IDE

1. Open **Cursor Settings** → **Features** → **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in:
   * **Name:** `faithfinder`
   * **Type:** `command`
   * **Command:** `npx -y faithfinder-mcp-server@latest`

---

### 3. Windsurf / Codeium Cascade

Add to your `~/.codeium/windsurf/mcp_config.json`:

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

---

### 4. Smithery (1-Click Install)

Install directly into your preferred client via [Smithery](https://smithery.ai):

```bash
npx -y @smithery/cli install faithfinder-mcp-server --client claude
```

---

### 5. Run Standalone via NPX (Testing)

```bash
npx -y faithfinder-mcp-server@latest
```

---

## 🛠️ Available Tools

### 1. `search_faith_finder_churches`
Search churches by location, style, theology, kids ministry, and keywords.

| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `searchQuery` | `string` | Free-form keywords, city, zip code, style, or theology | `"Dallas 75034 expository"` |
| `city` | `string` | Specific city filter | `"Dallas"`, `"Nashville"`, `"Irvine"` |
| `state` | `string` | Specific US state | `"TX"`, `"CA"`, `"TN"`, `"GA"`, `"FL"`, `"NC"` |
| `denomination` | `string` | Denomination filter | `"Non-Denominational"`, `"Baptist"`, `"Catholic"` |
| `worshipStyle` | `string` | Service style | `"Contemporary"`, `"Traditional"`, `"Liturgical"` |
| `hasKidsMinistry`| `boolean`| Require verified children/youth programs | `true` |
| `limit` | `number` | Number of results (default: 5, max: 20) | `5` |

### 2. `get_faith_finder_church_details`
Lookup complete profiles for a specific church community.

| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `churchName` | `string` (Required) | Name of the church | `"Mariners Church"` |
| `city` | `string` (Optional) | City to disambiguate campuses | `"Irvine"` |

---

## 📍 Geographic Coverage

FaithFinder indexes verified communities across key regions:

* **California:** Orange County (Lake Forest, Irvine, Aliso Viejo, Mission Viejo, Costa Mesa, Newport Beach)
* **Texas:** Dallas, Frisco, Plano, Southlake, McKinney, Allen, Austin, Houston
* **Tennessee:** Nashville, Brentwood, Franklin, Hendersonville
* **Georgia:** Atlanta, Alpharetta, Marietta, Roswell
* **Florida:** Orlando, Winter Park
* **North Carolina:** Charlotte, Matthews, Huntersville
* **Washington DC Metro:** Washington, Alexandria, Bethesda
* **National Leaders:** Multi-site and prominent faith communities nationwide

---

## 🎯 About FaithFinder & Soul Signature

FaithFinder by ArmorNGlory helps believers find a church home tailored to their worship style, theology preferences, and life stage.

* **Soul Signature Quiz:** [faithfinder.armornglory.com/quiz](https://faithfinder.armornglory.com/quiz)
* **Main Website:** [faithfinder.armornglory.com](https://faithfinder.armornglory.com)

---

## 📄 License

MIT License © 2026 ArmorNGlory
