# 🏨 Marriott Hotel Search - ChatGPT App

A ChatGPT app for searching Marriott hotels worldwide using the MCP protocol.

## 🚀 Quick Start

### 1. Start the Server
```bash
cd /Users/prituppalapati/Documents/marriott/chatgp-simple-mcp-main
npm run dev:hotels
```
Server starts at: `http://localhost:3000`

### 2. Expose to ChatGPT
```bash
ngrok http 3000
```
Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)

### 3. Add to ChatGPT
Use manifest URL: `https://YOUR-NGROK-URL/.well-known/apps.json`

## 🛠️ Available Tools (3)

### 1. **marriott_search_places**
Search for destinations (cities, regions, landmarks)
- Input: `query` (e.g., "New York", "San Francisco")
- Output: List of place suggestions with place IDs

### 2. **marriott_place_details**
Get location coordinates for a place
- Input: `placeId` (from search results)
- Output: Latitude, longitude, address, city, state, country

### 3. **marriott_search_hotels**
Search for Marriott hotels by location and dates
- Required: `latitude`, `longitude`, `startDate`, `endDate`
- Optional: `guests`, `rooms`, `limit`, `brands`, `amenities`, `minPrice`, `maxPrice`
- Output: Hotels with rates, distances, reviews, booking URLs

## 💬 Example Prompts

```
Find Marriott hotels in New York for next weekend, 2 guests
```

```
Show me Courtyard hotels in San Francisco with a pool under $200/night
```

```
Search for Residence Inn properties in Miami, July 1-5, family of 4
```

## 🎯 Search Workflow

ChatGPT automatically follows this 3-step process:

**Step 1:** Search for destination
```
marriott_search_places("San Francisco")
→ Returns place options with IDs
```

**Step 2:** Get coordinates
```
marriott_place_details(placeId)
→ Returns lat/lng: 37.7749, -122.4194
```

**Step 3:** Search hotels
```
marriott_search_hotels(37.7749, -122.4194, "2025-06-01", "2025-06-05", ...)
→ Returns hotel list with rates
```

## 🔍 Available Filters

### Brands
- **MC** - Marriott Hotels
- **RI** - Residence Inn
- **CY** - Courtyard
- **RZ** - The Ritz-Carlton
- **RC** - Renaissance Hotels
- **FI** - Fairfield Inn
- **SI** - SpringHill Suites
- And more...

### Amenities
- **POOL** - Swimming pool
- **WIFI** - Free WiFi
- **PARKING** - Parking available
- **FITNESS_CENTER** - Gym/Fitness center
- **RESTAURANT** - On-site dining
- **BREAKFAST** - Breakfast included
- **PET_FRIENDLY** - Pets allowed
- **BUSINESS_CENTER** - Business facilities

### Sorting
- **DISTANCE** - Sort by proximity
- **PRICE** - Sort by price (low to high)
- **RATING** - Sort by guest ratings

## 🤖 Agent Intelligence

The ChatGPT app includes smart behaviors:

✅ **Automatic workflow** - Completes all 3 steps automatically
✅ **Filter suggestions** - Recommends amenities based on trip type
✅ **Brand alternatives** - Suggests similar brands if preferred unavailable
✅ **Price guidance** - Helps set realistic budget expectations
✅ **Date flexibility** - Suggests alternative dates if needed
✅ **Multi-room support** - Handles family/group bookings

## 📊 Architecture

```
ChatGPT
    ↓ HTTPS (via ngrok)
Marriott MCP Server (hotel-server.ts)
    ├─→ Marriott GraphQL API (direct - for places/details)
    └─→ Local Marriott MCP (subprocess - for hotel search)
```

## 🐛 Troubleshooting

### Server won't start
```bash
lsof -ti:3000 | xargs kill -9
npm run dev:hotels
```

### Marriott search fails
```bash
# Check if local MCP is built
cd /Users/prituppalapati/Documents/marriott/mcps
npm run build
```

### Tools not responding in ChatGPT
1. Check server logs
2. Verify ngrok is running
3. Test manifest: `curl https://YOUR-NGROK-URL/.well-known/apps.json`

## 📝 Response Format

Hotels are returned with:
- **Hotel name** and brand
- **Distance** from search location (km/miles)
- **Price per night** in local currency
- **Star rating** and review count
- **Booking URL** (direct link to Marriott.com)
- **Coordinates** (lat/lng)
- **Availability status** (bookable or check availability)

## ✨ Pro Tips

1. **Always include dates** - Required for pricing information
2. **Specify guest count** - Affects room availability
3. **Use brand codes** - Faster than brand names
4. **Set realistic price range** - Helps narrow results
5. **Check facets** - First search shows available filters

## 🔗 Related Files

- `src/hotel-server.ts` - Main server code
- `package.json` - Scripts (`dev:hotels`, `start:hotels`)
- `QUICK_START.md` - Quick reference guide
- `START_CHATGPT_APP.sh` - One-command startup script

---

**Status**: ✅ Marriott-only integration complete
**Tools**: 3 (search places, place details, search hotels)
**Server**: http://localhost:3000
**Ready for**: 🚀 ChatGPT Apps

