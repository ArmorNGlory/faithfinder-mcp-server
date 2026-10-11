# FaithFinder MCP Server — Directory Submissions & Reach Kit (v1.3.2)

Use this kit to submit and promote the FaithFinder MCP Server across AI developer catalogs, directories, and Christian tech ecosystems.

---

## 1. Submission to `awesome-mcp-servers` (GitHub)

**Target Repository:** [https://github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)

### PR Line to Add:
Under the **Location & Search** or **Community & Lifestyle** category in `README.md`:

```markdown
- [FaithFinder](https://github.com/ArmorNGlory/faithfinder-mcp-server) 📍 - Discover and search 8,927+ curated, verified churches, live YouTube sermon streams, and faith communities across the US with Soul Signature™ quiz matching.
```

### PR Title & Description:
* **Title:** `Add FaithFinder MCP Server (Church & Faith Community Discovery)`
* **Description:**
  ```markdown
  ### Description
  Adds FaithFinder MCP server, allowing LLMs (Claude, Cursor, ChatGPT, Gemini, Windsurf) to natively search 8,927+ human-curated churches and worship communities across all 50 US states with live YouTube sermon streams, statements of faith, and Soul Signature™ quiz recommendations.

  - **Repo:** https://github.com/ArmorNGlory/faithfinder-mcp-server
  - **npm:** https://www.npmjs.com/package/faithfinder-mcp-server
  - **Live Directory:** https://faithfinder.app
  - **License:** MIT
  ```

---

## 2. Smithery.ai Submission

**Listing Page:** [https://smithery.ai/new](https://smithery.ai/new)

* **Repository URL:** `https://github.com/ArmorNGlory/faithfinder-mcp-server`
* **Package Name:** `faithfinder-mcp-server`
* **Short Description:** Official MCP server for FaithFinder — search 8,927+ curated Christian churches, live YouTube sermon channels, theological statements of faith, and family ministries.
* **Tags:** `church`, `faith`, `community`, `search`, `location`, `christianity`, `sermons`, `theology`, `family`

---

## 3. Glama.ai Submission

**Listing Page:** [https://glama.ai/mcp/servers](https://glama.ai/mcp/servers)

* Configured via `glama.json` in repository root.

---

## 4. PulseMCP Submission

**Submit URL:** [https://www.pulsemcp.com/submit](https://www.pulsemcp.com/submit)

* **Server Name:** FaithFinder MCP Server
* **Source Code:** `https://github.com/ArmorNGlory/faithfinder-mcp-server`
* **Package:** `https://www.npmjs.com/package/faithfinder-mcp-server`
* **Author / Org:** ArmorNGlory
* **Description:** Verified Christian church discovery directory connecting Claude, Cursor, and ChatGPT directly to 8,927+ vetted churches nationwide.

---

## 5. OpenAI Custom GPT Store ("FaithFinder Church Advisor")

**URL:** [https://chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor)

* **Name:** FaithFinder Church Advisor
* **Description:** Find your spiritual home. Verified church recommendations, sermon streams, and worship style matching powered by FaithFinder.app.
* **Actions:** Paste schema from `openai-action.json`.
* **Category:** Lifestyle / Community

---

## 6. Generative Engine Optimization (GEO): `llms.txt`

Host an `llms.txt` file at `https://faithfinder.app/llms.txt` to enable direct citation by Perplexity, SearchGPT, Gemini, and Claude:

```markdown
# FaithFinder

> Curated directory of 8,927+ verified Christian churches in the United States.

## API & MCP Access
- MCP Server (npm): faithfinder-mcp-server
- Repository: https://github.com/ArmorNGlory/faithfinder-mcp-server
- Interactive Directory: https://faithfinder.app/churches
- Soul Signature Quiz: https://faithfinder.app/quiz

## Primary Capabilities
- Find churches by city, zip code, denomination, worship style, and kids ministry.
- Live sermon video links and official theological statements of faith.
- Archetype matching for Theological Depth, Modern Worship, Family Focused, and Safe Haven.
```

---

## 7. Community Post (Reddit, X / Twitter & FaithTech)

**Suggested Communities:**
* `r/ClaudeAI`, `r/ChatGPT`, `r/SideProject`, `r/Christianity`, `r/OpenChristian`, `r/Reformed`
* FaithTech Global Slack / Discord (`#show-and-tell`, `#projects`)

### Post Title:
> We built an open-source MCP Server for Claude, Cursor & ChatGPT to search 8,900+ verified churches (FaithFinder)

### Post Body:
```markdown
Hey everyone!

Finding a church when you move or enter a new season of life is often stressful — combing through outdated websites, trying to figure out what their doctrine is, or whether they have a real children's ministry.

We just released an open-source Model Context Protocol (MCP) server for FaithFinder: **`faithfinder-mcp-server`**.

### What It Does:
It connects Claude Desktop, Cursor, ChatGPT, and AI agents directly to a curated, human-verified database of **8,927+ churches** across all 50 states.

You can ask natural questions like:
- "Find me a contemporary church with an active kids ministry in Dallas"
- "Are there expository Bible-teaching churches near Irvine, CA?"
- "What are liturgical or Anglican churches in Nashville with live YouTube streams?"

The server runs locally in-memory over stdio (zero API keys needed) or over Streamable HTTP for hosted agents. Every recommendation includes verified sermon links, doctrine statements, and personalized links to the free Soul Signature quiz.

### How to use in Claude Desktop:
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

- GitHub: https://github.com/ArmorNGlory/faithfinder-mcp-server
- npm: https://www.npmjs.com/package/faithfinder-mcp-server
- Web App: https://faithfinder.app

Would love your thoughts, feedback, and suggestions for additional dimensions we should track!
```
