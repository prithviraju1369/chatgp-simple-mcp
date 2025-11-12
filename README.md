# Top Movers ChatGPT App

A minimal ChatGPT app implemented with TypeScript, Express, and the Model Context Protocol SDK. The app exposes a `topMovers` MCP tool that fetches Alpha Vantage TOP_GAINERS_LOSERS data and renders responsive tables inside a ChatGPT widget. The widget automatically calls `window.openai.callTool('topMovers', { limit })` when loaded, and users can refresh or adjust the row count inline.

## Prerequisites

- Node.js 18+
- An Alpha Vantage API key (free at https://www.alphavantage.co/support/#api-key)
- (Optional) [ngrok](https://ngrok.com/) for tunneling the local server to ChatGPT

## Environment

```bash
export ALPHA_VANTAGE_API_KEY="your-key"
export PORT=3000 # optional override
```

## Install & run

```bash
npm install
npm run dev
```

The development script uses `tsx` to run `src/server.ts` directly. The server exposes:

- `POST /mcp` – MCP endpoint used by ChatGPT
- `GET /.well-known/apps.json` – ChatGPT app manifest pointing at the MCP server and `topMovers` tool
- `GET /` – basic health check

Bundled widget HTML is served via the MCP `top-movers-widget` resource (`ui://widget/top-movers.html`).

## Tunneling with ngrok

ChatGPT requires an HTTPS endpoint. After the server is running locally:

```bash
ngrok http $PORT
```

Copy the forwarded `https://<subdomain>.ngrok.app` URL. Use that base URL when registering the app in ChatGPT developer mode; ChatGPT will discover the manifest at `https://<subdomain>.ngrok.app/.well-known/apps.json` and call the MCP endpoint at `https://<subdomain>.ngrok.app/mcp`.

## Files of interest

- `src/server.ts` – Express server, MCP tool, Alpha Vantage integration, and manifest route
- `ui/widget.html` – Inline widget that calls `window.openai.callTool('topMovers', { limit })`, listens for MCP updates, and renders responsive tables
- `package.json` / `tsconfig.json` – TypeScript build setup

## Notes

- Alpha Vantage enforces rate limits. Handle throttling errors in ChatGPT by retrying after a short delay.
- Update the manifest (`/.well-known/apps.json`) metadata (name, description, instructions) as needed before production.
- When deploying beyond ngrok, ensure the widget resource is cache-busted if the HTML changes to avoid stale embeds inside ChatGPT.

## 🚀 Deployment

### Free Deployment Platforms

Deploy to free hosting platforms like Render, Railway, or Fly.io:

**Quick Start:**
1. See [DEPLOYMENT_QUICKSTART.md](./DEPLOYMENT_QUICKSTART.md) for 5-minute deployment
2. See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive guide
3. See [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) for overview

**Supported Platforms:**
- ✅ **Render** - Free tier, auto-deploy from Git
- ✅ **Railway** - Free credits, auto-deploy from Git
- ✅ **Fly.io** - Free tier, global edge deployment

**Build Process:**
The build script automatically:
1. Builds the MCP server (`mcp-local-main`)
2. Builds the main application
3. Bundles MCP server to `dist/mcp-server/index.js`

**Deployment Files:**
- `render.yaml` - Render configuration
- `railway.json` - Railway configuration
- `fly.toml` - Fly.io configuration
- `Dockerfile` - Docker container configuration

ngrok config add-authtoken 34f26CZ6VlSwaPZSUSjUKipDOHO_6VpDVkmsTtsmgefKNvM3p
