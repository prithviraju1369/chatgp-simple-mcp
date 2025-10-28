# Hotel Search Assistant - ChatGPT App

Integrated MCP server that brings Marriott and Airbnb search capabilities to ChatGPT.

## 🚀 Quick Start

### 1. Start the Server

```bash
cd /Users/prituppalapati/Documents/marriott/chatgp-simple-mcp-main
npm run dev:hotels
```

The server will start on `http://localhost:3000`

### 2. Expose with ngrok (for ChatGPT access)

In a new terminal:

```bash
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

### 3. Add to ChatGPT

1. Go to ChatGPT settings → **GPTs** (or Custom Instructions)
2. Add your app using the manifest URL:
   ```
   https://YOUR-NGROK-URL/.well-known/apps.json
   ```

## 🎯 Available Tools

### Marriott Tools
- **marriott_search_places** - Search for cities/destinations
- **marriott_place_details** - Get location coordinates  
- **marriott_search_hotels** - Search hotels by coordinates and dates

### Airbnb Tools
- **airbnb_search** - Search Airbnb properties
- **airbnb_listing_details** - Get detailed listing information

## 💬 Example Prompts

Try these in ChatGPT once connected:

```
Find me hotels in New York for next weekend, 2 guests
```

```
Compare Marriott and Airbnb options in Paris for July 1-5
```

```
Show me beachfront properties in Miami under $200/night
```

## 🔧 Architecture

```
ChatGPT App
    ↓
HTTP MCP Server (hotel-server.ts)
    ├─→ Marriott GraphQL API (direct)
    ├─→ Local Marriott MCP (subprocess)
    └─→ Airbnb MCP (subprocess via npx)
```

## 📝 Agent Instructions

The app includes comprehensive instructions from your existing agents:

- **Workflow**: Gather details → Search → Present results → Suggest alternatives
- **Multi-platform**: Compares Marriott vs Airbnb
- **Filters**: Brands, amenities, price ranges
- **Proactive**: Suggests dates, alternatives, comparisons

## 🐛 Debugging

Check the server logs:
```bash
npm run dev:hotels
```

Test tools manually:
```bash
curl http://localhost:3000/.well-known/apps.json
```

## 🔗 Integration with Your Existing System

This server works alongside your existing setup:

- **Python Backend** (`marriott chat/backend`) - Keep for your React frontend
- **ChatGPT App** (this) - New standalone app for ChatGPT users
- **Shared MCP Servers** - Both use the same Marriott/Airbnb MCP servers

No conflicts! They're separate deployments.

