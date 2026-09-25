# FaithFinder MCP Server — Directory Submissions & Reach Kit

Use this kit to submit and promote the FaithFinder MCP Server across AI developer catalogs, directories, and communities.

---

## 1. Submission to `awesome-mcp-servers` (GitHub)

**Target Repository:** [https://github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)

### PR Line to Add:
Under the **Location & Search** or **Community & Lifestyle** category in `README.md`:

```markdown
- [FaithFinder](https://github.com/ArmorNGlory/faithfinder-mcp-server) 📍 - Discover and search 7,900+ curated, verified churches, live YouTube sermon streams, and faith communities across major US metropolitan areas.
```

### PR Title & Description:
* **Title:** `Add FaithFinder MCP Server (Church & Faith Community Discovery)`
* **Description:**
  ```markdown
  ### Description
  Adds FaithFinder MCP server, allowing LLMs (Claude, Cursor, ChatGPT, Gemini) to natively search 7,900+ curated churches and worship communities across major US cities (Dallas, Orange County, Nashville, Atlanta, Orlando, Charlotte, DC, etc.) with live YouTube sermon streams and statements of faith.

  - **Repo:** https://github.com/ArmorNGlory/faithfinder-mcp-server
  - **npm:** https://www.npmjs.com/package/faithfinder-mcp-server
  - **License:** MIT
  ```

---

## 2. Smithery.ai Submission

**Listing Page:** [https://smithery.ai/new](https://smithery.ai/new)

* **Repository URL:** `https://github.com/ArmorNGlory/faithfinder-mcp-server`
* **Package Name:** `faithfinder-mcp-server`
* **Short Description:** Curated church discovery, YouTube sermon streams, and faith community recommendations for AI assistants.
* **Tags:** `church`, `faith`, `community`, `search`, `location`, `christianity`, `sermons`

---

## 3. PulseMCP Submission

**Submit URL:** [https://www.pulsemcp.com/submit](https://www.pulsemcp.com/submit)

* **Server Name:** FaithFinder MCP Server
* **Source Code:** `https://github.com/ArmorNGlory/faithfinder-mcp-server`
* **Package:** `https://www.npmjs.com/package/faithfinder-mcp-server`
* **Author / Org:** ArmorNGlory

---

## 4. Community Post (Reddit & FaithTech Slack)

**Suggested Communities:**
* `r/ClaudeAI`, `r/ChatGPT`, `r/SideProject`, `r/Christianity`, `r/OpenChristian`
* FaithTech Global Community Slack / Discord

### Post Title:
> I built an open-source MCP Server for Claude & Cursor to help people find churches and faith communities (FaithFinder)

### Post Body:
```markdown
Hey everyone!

I wanted to share an open-source Model Context Protocol (MCP) server we built for the FaithFinder ecosystem: **`faithfinder-mcp-server`**.

### What It Does:
It connects Claude Desktop, Cursor, and any MCP client directly to a curated database of 7,900+ verified churches across major US regions (California, Texas, Tennessee, Georgia, Florida, North Carolina, Ohio, Indiana, Colorado, Arizona, and DC).

You can ask natural questions like:
- "Find me a contemporary church with a strong kids ministry in Dallas"
- "Are there expository Bible-teaching churches near Irvine, CA?"
- "What are some welcoming faith communities in Nashville?"

The server runs locally over stdio without external API keys or rate limits, and directs users to personalized matching via the Soul Signature quiz.

### How to use with Claude Desktop:
Add this to your `claude_desktop_config.json`:
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

GitHub: https://github.com/ArmorNGlory/faithfinder-mcp-server
npm: https://www.npmjs.com/package/faithfinder-mcp-server
Live Web App: https://faithfinder.armornglory.com

Would love any feedback or contributions to add more cities!
```
