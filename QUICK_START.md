# 🚀 Quick Start - Marriott ChatGPT App

## Start the Server (3 Ways)

### Option 1: Using the convenience script
```bash
./START_CHATGPT_APP.sh
```

### Option 2: Using npm
```bash
cd chatgp-simple-mcp-main
npm run dev:hotels
```

### Option 3: Manual
```bash
cd chatgp-simple-mcp-main
node dist/hotel-server.js
```

## Expose to ChatGPT

1. **Start ngrok** (in a new terminal):
```bash
ngrok http 3000
```

2. **Copy the ngrok URL** (e.g., `https://abc123.ngrok-free.app`)

3. **Add to ChatGPT**:
   - Go to ChatGPT settings
   - Add custom GPT
   - Use: `https://YOUR-NGROK-URL/.well-known/apps.json`

## Test It

Try these prompts in ChatGPT:

```
Find Marriott hotels in San Francisco for next weekend
```

```
Show me Courtyard hotels in New York with free WiFi under $200/night
```

```
Search for beach resorts in Miami with a pool, July 1-5
```

## What You Get

✅ **3 Marriott Tools**
- Search places (destinations, cities)
- Get place details (coordinates)
- Search hotels (with filters)

✅ **Smart Agent**
- 3-step workflow (automatic)
- Filters: brands, amenities, price
- Sorting: distance, price, rating
- Calculates dates from natural language

✅ **Rich Results**
- Hotel name, brand, location
- Ratings and reviews
- Prices per night
- Direct Marriott.com booking links

## Need Help?

📄 See `MARRIOTT_ONLY_README.md` for full documentation

🐛 Troubleshooting tips in that doc too!

