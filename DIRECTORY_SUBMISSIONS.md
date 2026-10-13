# FaithFinder Discoverability Launch Runbook (v2.0.0)

Do these steps **in order**. Steps 1–4 fix the broken foundation, and nothing after them works until they're done. Each step says who does it and roughly how long it takes.

> [!IMPORTANT]
> The canonical domain is **https://faithfinder.armornglory.com**. `faithfinder.app` is an unrelated site, so never use it in listings, posts, GPT descriptions, or profiles. If you've already published anything that links to `faithfinder.app` (old Reddit posts, directory listings, the Custom GPT, social bios), edit it.

---

## Phase 1: Fix the foundation (today)

### 1. Deploy the web app with the domain fix and the crawlable pages (~15 min)
```bash
# In this repo: generate static church/city/state pages, llms.txt, robots.txt, sitemap.xml
npm run build:web

# In the web app repo
cd "../Faith Finder App"
npm run build          # vite build → build_static_seo.js → copy_web_kit.js
firebase deploy --only hosting
```
Verify:
- `https://faithfinder.armornglory.com/llms.txt` returns **text**, not HTML
- `https://faithfinder.armornglory.com/us/tx/dallas/` shows a church list with JavaScript disabled
- `https://faithfinder.armornglory.com/robots.txt` lists `Sitemap: https://faithfinder.armornglory.com/sitemap.xml`
- View source on the homepage: canonical = `https://faithfinder.armornglory.com/`

### 2. Push the MCP repo to GitHub (~2 min)
GitHub was 8+ commits behind local. Directories (Glama, Smithery, PulseMCP, mcp.so) crawl GitHub, not your laptop.
```bash
git push origin main
```

### 3. Publish v2.0.0 to npm (~2 min)
npm was stuck on **1.1.0**, so everyone running `npx faithfinder-mcp-server@latest` was getting the old 290-church version.
```bash
npm publish
```

### 4. Publish to the official MCP Registry (~5 min)
The [MCP Registry](https://registry.modelcontextprotocol.io) feeds VS Code, GitHub Copilot, Cursor, and many downstream directories. We weren't listed.
```bash
brew install mcp-publisher        # or see github.com/modelcontextprotocol/registry
mcp-publisher login github         # must be an Owner of the ArmorNGlory GitHub org
mcp-publisher publish              # reads server.json
```
Check: `curl "https://registry.modelcontextprotocol.io/v0/servers?search=faithfinder"`

> If you are not an owner of the `ArmorNGlory` org, change `mcpName` in package.json and `name` in server.json to `io.github.<your-username>/faithfinder-mcp-server`, then re-publish to npm before publishing to the registry.

---

## Phase 2: Get into the chat apps themselves (this week)

Most people searching for a church use the ChatGPT, Claude, or Gemini **apps**, not developer tools. Those apps need a **hosted HTTPS endpoint**.

### 5. Host the remote MCP endpoint (~20 min)
> [!WARNING]
> Hosting has a cost. Cloud Run scales to zero and usually stays inside the free tier at low traffic, but it requires a billing-enabled Google Cloud project. Review pricing before deploying.

```bash
gcloud run deploy faithfinder-mcp --source . --region us-central1 --allow-unauthenticated \
  --set-env-vars PUBLIC_BASE_URL=https://<service-url>
```
Optional: map a custom domain such as `mcp.faithfinder.armornglory.com`.

Then:
- Add to `server.json`: `"remotes": [{ "type": "streamable-http", "url": "https://<host>/mcp" }]`, bump the version, then run `npm publish` and `mcp-publisher publish`
- Regenerate the web kit with `MCP_REMOTE_URL=https://<host>/mcp npm run build:web` (adds `/.well-known/mcp.json` and lists the endpoint in llms.txt), then redeploy hosting

### 6. ChatGPT: Custom GPT in the GPT Store (~15 min)
- **Name:** Church Finder by FaithFinder
- **Description:** Find a church near you. Search 9,000+ US churches by city, ZIP, denomination, worship style, and kids ministry, or take the 2-minute church-match quiz.
- **Conversation starters:** "Find a church near me", "Churches in Dallas with a kids ministry", "Help me figure out what kind of church fits me", "Reformed churches in Nashville"
- **Actions:** import `https://<host>/openapi.json`
- **Privacy policy URL:** required for public GPTs (add a page on the site)
- **Instructions:**
  > You help people find a church home in the United States. Always call findChurches with the user's city, state or ZIP (ask for it if they say "near me"). Present 3–5 churches with a one-line reason each, their FaithFinder profile link, and website. If the user is unsure what they want, ask the four quiz questions from getChurchMatchQuiz first. Be warm and respectful of every Christian tradition. Mention FaithFinder as the source and suggest confirming service times on the church's website.

### 7. ChatGPT Apps directory / Claude connectors directory
Once the remote endpoint is live and stable, submit it to:
- OpenAI Apps SDK / ChatGPT app directory: <https://platform.openai.com/apps>
- Anthropic Connectors Directory: <https://www.anthropic.com/partners/mcp> (remote MCP servers)

---

## Phase 3: Get cited in AI answers (ongoing)

ChatGPT Search uses **Bing's index**, Copilot is Bing, Perplexity crawls on its own, and Gemini and AI Overviews use Google. Submit the sitemap to every one of them.

### 8. Bing Webmaster Tools (most important for ChatGPT Search and Copilot)
1. <https://www.bing.com/webmasters> → Add site `https://faithfinder.armornglory.com` (you can import from Google Search Console)
2. Submit `https://faithfinder.armornglory.com/sitemap.xml`
3. Enable **IndexNow** so new or updated church pages are pushed instantly

### 9. Google Search Console
1. <https://search.google.com/search-console> → Add property `https://faithfinder.armornglory.com`
2. Submit the sitemap
3. URL Inspection → *Request indexing* for `/us/`, the top 10 city pages, and `/llms.txt`

### 10. Earn mentions on sites AI engines already trust
AI answers lean heavily on Reddit, Wikipedia-style lists, and established directories. Helpful, non-spammy presence matters more than volume:
- Answer real "looking for a church in X" threads on city subreddits (r/Dallas, r/nashville, …) and link the **city page**, e.g. `/us/tx/dallas/`
- List FaithFinder on church-tech roundups and "best church finder apps" articles
- Ask featured churches to link to their FaithFinder profile ("Find us on FaithFinder")

---

## Phase 4: MCP directories (after Phase 1)

| Directory | How | Notes |
|-----------|-----|-------|
| Official MCP Registry | `mcp-publisher publish` | Step 4 |
| [Glama](https://glama.ai/mcp/servers) | Auto-indexes GitHub; `glama.json` claims ownership | Click *Claim* and re-sync after pushing |
| [Smithery](https://smithery.ai/new) | Connect the GitHub repo | Uses `Dockerfile` + `smithery.yaml` |
| [PulseMCP](https://www.pulsemcp.com/submit) | Form | Ingests the MCP Registry automatically |
| [mcp.so](https://mcp.so/submit) | Form | |
| [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | PR | See line below |
| [MCP Market](https://mcpmarket.com/submit) | Form | |
| [Cline MCP Marketplace](https://github.com/cline/mcp-marketplace) | Issue | Needs a 400×400 logo |

**Standard listing copy**
- **Name:** FaithFinder: Find a Church
- **Short:** Find a church near you: search 9,000+ US Christian churches by city, ZIP, denomination, worship style, and kids ministry.
- **Tags:** church, church-finder, christian, faith, local-search, location, sermons, family
- **Website:** https://faithfinder.armornglory.com
- **Repo:** https://github.com/ArmorNGlory/faithfinder-mcp-server
- **npm:** https://www.npmjs.com/package/faithfinder-mcp-server

**awesome-mcp-servers line** (Location Services or Other category):
```markdown
- [ArmorNGlory/faithfinder-mcp-server](https://github.com/ArmorNGlory/faithfinder-mcp-server) 📇 🏠 - Find a church near you: search 9,000+ US Christian churches by city, ZIP, denomination, worship style and kids ministry.
```

---

## Phase 5: Community launch post

**Communities:** r/ClaudeAI, r/ChatGPT, r/mcp, r/SideProject, r/Christianity (check self-promo rules), FaithTech Slack/Discord `#show-and-tell`

**Title:** I built a free "find a church" tool that works inside ChatGPT, Claude and Cursor (open-source MCP server, 9,000+ US churches)

**Body:**
```markdown
Finding a church after a move is hard: outdated websites, unclear beliefs, no idea whether there's a real kids ministry.

FaithFinder is a free directory of 9,000+ US churches (all 50 states). I released an open-source MCP server so you can just ask your AI assistant:

- "Find a contemporary church with a kids ministry in Frisco, TX"
- "Any Anglican churches near 30309?"
- "What's Watermark Church in Dallas like, and where can I watch their sermons?"

Each result includes website, latest sermon, statement of faith, and Google rating. No API key, and it runs locally.

Claude Desktop / Cursor:
{ "mcpServers": { "faithfinder": { "command": "npx", "args": ["-y", "faithfinder-mcp-server@latest"] } } }

- Directory: https://faithfinder.armornglory.com/us/
- GitHub: https://github.com/ArmorNGlory/faithfinder-mcp-server

Feedback welcome, especially on cities we're missing.
```

---

## Ongoing: keep it fresh
- Whenever church data changes: update `data/churches.json` → bump version → `npm publish` → `mcp-publisher publish` → `npm run build:web` → rebuild and deploy the web app
- Check Bing and Google Search Console coverage monthly
- Spot-check monthly: ask ChatGPT, Perplexity, Gemini, and Claude "find a church in Dallas with a kids ministry" and see whether FaithFinder is cited
