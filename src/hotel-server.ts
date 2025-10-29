#!/usr/bin/env node
/**
 * Integrated Hotel Search MCP Server for ChatGPT
 * Combines Marriott and Airbnb search capabilities
 */

import 'dotenv/config';
import axios from 'axios';
import cors from 'cors';
import express from 'express';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

const app = express();

app.use(
  cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'Mcp-Session-Id'],
  }),
);
app.use(express.json());

const serverInfo = {
  name: 'marriott-search-assistant',
  version: '1.0.0',
};

const mcpServer = new McpServer(serverInfo);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hotelWidgetPath = path.resolve(__dirname, '../ui/hotel-widget.html');

let hotelWidgetHtml = '';
try {
  hotelWidgetHtml = readFileSync(hotelWidgetPath, 'utf8');
} catch (error) {
  console.warn('Unable to load hotel widget HTML at startup:', error);
}

// ============================================================================
// MARRIOTT SEARCH TOOLS
// ============================================================================

const MARRIOTT_SEARCH_API_URL = "https://www.marriott.com/mi/query/phoenixShopSuggestedPlacesQuery";
const MARRIOTT_DETAILS_API_URL = "https://www.marriott.com/mi/query/phoenixShopSuggestedPlacesDetailsQuery";
const MARRIOTT_HOTEL_SEARCH_API_URL = "https://www.marriott.com/mi/query/phoenixShopDatedSearchByGeoQuery";

interface MarriottPlace {
  placeId: string;
  description: string;
  primaryDescription: string;
  secondaryDescription: string;
}

interface PlaceLocation {
  [x: string]: unknown;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  countryName: string;
}

interface PlaceDetails {
  [x: string]: unknown;
  placeId: string;
  description: string;
  distance: number | null;
  location: PlaceLocation;
  types: string[];
  destinationType: string;
}

async function searchMarriottPlaces(query: string): Promise<{ places: MarriottPlace[]; total: number }> {
  const graphqlQuery = `query phoenixShopSuggestedPlacesQuery($query: String!) {
    suggestedPlaces(query: $query) {
      edges {
        node {
          placeId
          description
          primaryDescription
          secondaryDescription
          __typename
        }
        __typename
      }
      total
      __typename
    }
  }`;

  const response = await fetch(MARRIOTT_SEARCH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'apollographql-client-name': 'phoenix_homepage',
      'apollographql-client-version': 'v1',
      'application-name': 'homepage',
      'graphql-operation-name': 'phoenixShopSuggestedPlacesQuery',
      'graphql-operation-signature': '70b3555c91797ca8945e4f4b1bdda42c3e37fa1f08fa99feafb73195702c1d34',
      'graphql-require-safelisting': 'true',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Origin': 'https://www.marriott.com',
      'Referer': 'https://www.marriott.com/default.mi',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
    body: JSON.stringify({
      operationName: 'phoenixShopSuggestedPlacesQuery',
      variables: { query },
      query: graphqlQuery,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: any = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  const places = data.data?.suggestedPlaces?.edges?.map((edge: any) => edge.node) || [];
  const total = data.data?.suggestedPlaces?.total || 0;

  return { places, total };
}

async function getMarriottPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const graphqlQuery = `query phoenixShopSuggestedPlacesDetailsQuery($placeId: ID!) {
    suggestedPlaceDetails(placeId: $placeId) {
      placeId
      description
      distance
      location {
        latitude
        longitude
        address
        city
        state
        country
        countryName
        __typename
      }
      types
      destinationType
      __typename
    }
  }`;

  const response = await fetch(MARRIOTT_DETAILS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'apollographql-client-name': 'phoenix_homepage',
      'apollographql-client-version': 'v1',
      'application-name': 'homepage',
      'graphql-operation-name': 'phoenixShopSuggestedPlacesDetailsQuery',
      'graphql-operation-signature': '0b89c8ea7a6a6408eaee651983d6c7ee168670b727cc5beea980b2d2edfdbe2b',
      'graphql-require-safelisting': 'true',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Origin': 'https://www.marriott.com',
      'Referer': 'https://www.marriott.com/default.mi',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
    body: JSON.stringify({
      operationName: 'phoenixShopSuggestedPlacesDetailsQuery',
      variables: { placeId },
      query: graphqlQuery,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: any = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data?.suggestedPlaceDetails;
}


// ============================================================================
// REGISTER HOTEL WIDGET
// ============================================================================

mcpServer.registerResource(
  'hotel-results-widget',
  'ui://widget/hotel-results.html',
  {},
  async () => {
    let html = hotelWidgetHtml;
    try {
      html = readFileSync(hotelWidgetPath, 'utf8');
    } catch (error) {
      if (!html) {
        throw error;
      }
      console.warn('Falling back to cached hotel widget HTML:', error);
    }

    return {
      contents: [
        {
          uri: 'ui://widget/hotel-results.html',
          mimeType: 'text/html+skybridge',
          text: html,
          _meta: {
            'openai/widgetDescription': 'Displays Marriott hotel search results with cards, pricing, and booking links.',
            'openai/widgetPrefersBorder': true,
            'openai/widgetCSP': {
              connect_domains: [],
              resource_domains: ['https://www.marriott.com'],
            },
          },
        },
      ],
    };
  }
);

// ============================================================================
// REGISTER MARRIOTT TOOLS
// ============================================================================

mcpServer.registerTool(
  'marriott_search_places',
  {
    title: '[STEP 1/3] Search Marriott Locations',
    description: 'REQUIRED FIRST STEP: Search for a city or destination to get place IDs. After calling this, you MUST call marriott_place_details with the placeId from results. DO NOT stop after this step - it only provides place IDs, not actual hotel results.',
    inputSchema: {
      query: z.string().describe('City or destination name (e.g., "Hyderabad", "San Francisco", "Mumbai")'),
    },
    outputSchema: {
      places: z.array(z.object({
        placeId: z.string(),
        description: z.string(),
        primaryDescription: z.string(),
        secondaryDescription: z.string(),
      })),
      total: z.number(),
    },
    annotations: {
      readOnlyHint: true,
    },
  },
  async (args: { query: string }) => {
    console.log('\n🟢 [STEP 1] marriott_search_places CALLED');
    console.log('📥 Query:', args.query);
    
    const result = await searchMarriottPlaces(args.query);
    console.log(`✅ [STEP 1] Found ${result.total} location(s)`);
    console.log('📍 First place:', result.places[0]);
    
    const firstPlaceId = result.places[0]?.placeId || '';
    return {
      content: [{ 
        type: 'text' as const, 
        text: `✅ Step 1/3 Complete - Found ${result.total} location(s)

⚠️ NO HOTEL DATA YET - This is just a list of matching places.

🔴 MANDATORY NEXT STEP - Call marriott_place_details with:
- placeId: ${firstPlaceId}

DO NOT stop here. Continue to Step 2 immediately.

Location Options:\n${JSON.stringify(result, null, 2)}` 
      }],
      structuredContent: result,
    };
  }
);

mcpServer.registerTool(
  'marriott_place_details',
  {
    title: '[STEP 2/3] Get Coordinates for Location',
    description: 'REQUIRED SECOND STEP: Get latitude and longitude coordinates for a place. Takes placeId from marriott_search_places results. After getting coordinates, you MUST call marriott_search_hotels with these coordinates. DO NOT skip to web search - coordinates are REQUIRED for hotel search.',
    inputSchema: {
      placeId: z.string().describe('Place ID obtained from marriott_search_places results'),
    },
    outputSchema: {
      placeId: z.string(),
      description: z.string(),
      location: z.object({
        latitude: z.number(),
        longitude: z.number(),
        address: z.string(),
        city: z.string(),
        state: z.string(),
        country: z.string(),
      }),
    },
    annotations: {
      readOnlyHint: true,
    },
  },
  async (args: { placeId: string }) => {
    console.log('\n🟡 [STEP 2] marriott_place_details CALLED');
    console.log('📥 PlaceId:', args.placeId);
    
    const result = await getMarriottPlaceDetails(args.placeId);
    console.log(`✅ [STEP 2] Got coordinates: ${result.location.latitude}, ${result.location.longitude}`);
    console.log('📍 Location:', result.location);
    
    return {
      content: [{ 
        type: 'text' as const, 
        text: `✅ Step 2/3 Complete - Got coordinates: ${result.location.latitude}, ${result.location.longitude}

⚠️ WARNING: NO HOTEL DATA YET! These are just coordinates.

🔴 MANDATORY NEXT STEP - You MUST call marriott_search_hotels NOW with:
- latitude: ${result.location.latitude}
- longitude: ${result.location.longitude}  
- startDate: (check-in date YYYY-MM-DD)
- endDate: (check-out date YYYY-MM-DD)
- guests: (number of adults)
- childAges: (if children mentioned)

DO NOT present results to the user yet. You have NO hotel data until you call marriott_search_hotels.

Location Details:\n${JSON.stringify(result, null, 2)}` 
      }],
      structuredContent: result,
    };
  }
);

mcpServer.registerTool(
  'marriott_search_hotels',
  {
    title: '[STEP 3/3] Search Hotels - FINAL STEP',
    description: `REQUIRED FINAL STEP: Search for actual Marriott hotels using coordinates from marriott_place_details.

🚨 CRITICAL 2-CALL WORKFLOW FOR FILTERS:
If user mentions ANY filters (pool, spa, Sheraton, breakfast, etc.):
1. CALL 1 (Discovery): Call this tool WITHOUT filter params → Get "=== AVAILABLE FACETS ===" in response
2. CALL 2 (Filtered): Call this tool AGAIN with exact codes from CALL 1's facets
Example: User wants "pool" → CALL 1 (no filters) → See "pool" in facets → CALL 2 with amenities=["pool"]

⚠️ NEVER guess filter codes! Always get them from CALL 1's response first!

This returns the actual hotel list with prices and booking links. This is the ONLY tool that returns hotel results.`,
    inputSchema: {
      latitude: z.number().describe('Latitude from marriott_place_details'),
      longitude: z.number().describe('Longitude from marriott_place_details'),
      startDate: z.string().describe('Check-in date in YYYY-MM-DD format'),
      endDate: z.string().describe('Check-out date in YYYY-MM-DD format'),
      guests: z.number().optional().default(1).describe('Number of adult guests'),
      rooms: z.number().optional().default(1).describe('Number of rooms'),
      childAges: z.array(z.number()).optional().default([]).describe('Array of child ages, e.g. [2, 5] for 2 kids aged 2 and 5'),
      limit: z.number().optional().default(10).describe('Max results (default 10)'),
      brands: z.array(z.string()).optional().default([]).describe('Filter by brand codes (e.g., ["MC", "RI"])'),
      amenities: z.array(z.string()).optional().default([]).describe('Filter by amenities (e.g., ["POOL", "WIFI"])'),
      activities: z.array(z.string()).optional().default([]).describe('Filter by activities (e.g., ["SPA", "GOLF"])'),
    },
    annotations: {
      readOnlyHint: true,
    },
    _meta: {
      'openai/outputTemplate': 'ui://widget/hotel-results.html',
      'openai/widgetAccessible': true,
      'openai/toolInvocation/invoking': 'Searching Marriott hotels...',
      'openai/toolInvocation/invoked': 'Found hotels! Displaying results.',
    },
  },
  async (args: any) => {
    console.log('\n🔵 [STEP 3] marriott_search_hotels CALLED');
    console.log('📥 Input arguments:', JSON.stringify(args, null, 2));
    
    // 🎯 AUTOMATIC FILTER DETECTION & ENFORCEMENT
    // Track if this location has been searched before
    const locationKey = `${args.latitude},${args.longitude}`;
    const lastSearchKey = (global as any).__lastSearchLocation;
    const isNewLocation = lastSearchKey !== locationKey;
    
    // Detect if user is trying to use filters
    const hasFilters = (args.brands && args.brands.length > 0) ||
                      (args.amenities && args.amenities.length > 0) ||
                      (args.activities && args.activities.length > 0);
    
    if (hasFilters && isNewLocation) {
      // FIRST SEARCH WITH FILTERS - FORCE DISCOVERY CALL FIRST!
      console.error('🚨 FILTER ERROR: First search at this location MUST be without filters!');
      console.error('⚠️ Filters requested:', {
        brands: args.brands,
        amenities: args.amenities,
        activities: args.activities
      });
      console.error('⚠️ Location:', locationKey);
      
      return {
        content: [{ 
          type: 'text' as const, 
          text: `🚨 ERROR: You MUST make a discovery call FIRST before using filters!

STEP 1 (REQUIRED): Call marriott_search_hotels WITHOUT any filter parameters:
- latitude: ${args.latitude}
- longitude: ${args.longitude}
- startDate: ${args.startDate}
- endDate: ${args.endDate}
- guests: ${args.guests}
- DO NOT include: brands, amenities, activities

STEP 2: Read the response which contains "=== AVAILABLE FACETS ===" section

STEP 3: Call marriott_search_hotels AGAIN with exact filter codes from STEP 1's facets

You tried to skip STEP 1! Please make the discovery call first.` 
        }],
      };
    }
    
    // Track this location for next call
    if (!hasFilters) {
      (global as any).__lastSearchLocation = locationKey;
      console.log('✅ Discovery call made for location:', locationKey);
    } else {
      console.log('✅ Filtered call made (after discovery) for location:', locationKey);
    }
    
    // Call the local Marriott MCP server via subprocess
    const marriottPath = '/Users/prithvirajuuppalapati/Documents/agentic-travel-chat/mcp-local-main/dist/index.js';
    console.log('🔧 Spawning subprocess:', marriottPath);
    
    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn('node', [marriottPath]);
      
      let stdout = '';
      let stderr = '';
      let jsonrpcId = 1;
      
      proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log('📤 Subprocess stdout chunk:', chunk.substring(0, 200));
        
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              console.log('✅ Parsed JSON response from subprocess:', response.id);
              if (response.result && response.id === jsonrpcId) {
                const text = response.result.content?.[0]?.text || JSON.stringify(response.result);
                console.log('🎯 Got result from subprocess, length:', text.length);
                proc.kill();
                resolve(text);
              }
            } catch (e) {
              // Not JSON yet, keep accumulating
            }
          }
        }
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('❌ Subprocess stderr:', data.toString());
      });

      proc.on('close', (code) => {
        console.log('🔴 Subprocess closed with code:', code);
        if (stderr) console.error('🔴 Subprocess stderr output:', stderr);
        if (!stdout.includes('result')) {
          reject(new Error('Marriott MCP failed'));
        }
      });

      // Initialize
      const initMsg = {
        jsonrpc: '2.0',
        id: jsonrpcId++,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'marriott-search-assistant', version: '1.0.0' }
        }
      };
      console.log('📨 Sending initialize:', initMsg);
      proc.stdin.write(JSON.stringify(initMsg) + '\n');

      // Call tool
      setTimeout(() => {
        const toolMsg = {
          jsonrpc: '2.0',
          id: jsonrpcId,
          method: 'tools/call',
          params: { name: 'marriott_search_hotels', arguments: args }
        };
        console.log('📨 Sending tool call:', toolMsg);
        proc.stdin.write(JSON.stringify(toolMsg) + '\n');
      }, 500);
    });

    // Parse the result to extract structured data
    console.log('🔍 Parsing result, length:', result.length);
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(result);
      console.log('✅ Successfully parsed JSON data');
      console.log('📊 Data structure keys:', Object.keys(parsedData));
    } catch (e) {
      console.error('❌ Failed to parse JSON result:', e);
      console.error('📄 Raw result (first 500 chars):', result.substring(0, 500));
      // If not JSON, return as-is
      return {
        content: [{ type: 'text' as const, text: result }],
      };
    }

    // Format hotels in a clean, card-like text format
    const hotels = parsedData.data?.data?.search?.lowestAvailableRates?.searchByGeolocation?.edges || [];
    const total = parsedData.data?.data?.search?.lowestAvailableRates?.searchByGeolocation?.total || 0;
    
    console.log(`📍 Found ${hotels.length} hotels (total: ${total})`);
    
    if (hotels.length === 0) {
      console.warn('⚠️ No hotels found in result');
      return {
        content: [{ type: 'text' as const, text: '❌ No hotels found for your search criteria. Try adjusting dates or location.' }],
      };
    }

    let formattedText = `✅ **Found ${total} Marriott Hotels** (showing ${hotels.length})\n\n`;
    
    hotels.forEach((edge: any, index: number) => {
      const hotel = edge.node;
      const prop = hotel.property;
      const info = prop.basicInformation;
      const distanceMiles = (hotel.distance / 1609.34).toFixed(1);
      const rating = prop.reviews?.stars?.count;
      const reviewCount = prop.reviews?.numberOfReviews?.count;
      
      // Get price
      let priceText = '';
      if (hotel.rates?.[0]?.rateModes?.lowestAverageRate) {
        const rate = hotel.rates[0].rateModes.lowestAverageRate;
        const amount = rate.amount?.amount; // Use average rate per night, not total
        const decimalPoint = rate.amount?.decimalPoint || 2;
        if (amount) {
          const pricePerNight = (amount / Math.pow(10, decimalPoint)).toFixed(0);
          priceText = `💰 $${pricePerNight}/night`;
        }
      }
      
      formattedText += `**${index + 1}. ${info.name}**\n`;
      if (info.brand) {
        formattedText += `🏨 ${info.brand.name}`;
      }
      if (priceText) {
        formattedText += ` | ${priceText}`;
      }
      formattedText += `\n📍 ${distanceMiles} miles away`;
      
      if (rating) {
        formattedText += ` | ⭐ ${rating}`;
        if (reviewCount) {
          formattedText += ` (${reviewCount} reviews)`;
        }
      }
      
      formattedText += `\n🔗 [Book Now](https://www.marriott.com/hotels/travel/${prop.seoNickname}/)\n\n`;
    });

    // Add facets if present (for discovery)
    const facets = parsedData.data?.data?.search?.lowestAvailableRates?.searchByGeolocation?.facets;
    if (facets && facets.length > 0 && !args.brands?.length && !args.amenities?.length) {
      formattedText += `\n---\n\n**🔍 Available Filters:**\n`;
      
      const brandFacet = facets.find((f: any) => f.type?.code === 'brands');
      if (brandFacet?.buckets?.length > 0) {
        const topBrands = brandFacet.buckets.slice(0, 5).map((b: any) => b.label).join(', ');
        formattedText += `**Brands:** ${topBrands}\n`;
      }
      
      const amenityFacet = facets.find((f: any) => f.type?.code === 'amenities');
      if (amenityFacet?.buckets?.length > 0) {
        const topAmenities = amenityFacet.buckets.slice(0, 8).map((b: any) => b.label).join(', ');
        formattedText += `**Amenities:** ${topAmenities}\n`;
      }
      
      formattedText += `\n💡 *Ask me to filter by brand, amenities, or price!*`;
    }

    // Prepare structured data for widget
    console.log('🎨 Creating structured hotel cards...');
    const hotelCards = hotels.map((edge: any, index: number) => {
      const hotel = edge.node;
      const prop = hotel.property;
      const info = prop.basicInformation;
      const distanceMiles = (hotel.distance / 1609.34).toFixed(1);
      
      let price = null;
      if (hotel.rates?.[0]?.rateModes?.lowestAverageRate) {
        const rate = hotel.rates[0].rateModes.lowestAverageRate;
        const amount = rate.amount?.amount;
        const decimalPoint = rate.amount?.decimalPoint || 2;
        if (amount) {
          price = `$${(amount / Math.pow(10, decimalPoint)).toFixed(0)}`;
        }
      }
      
      const card = {
        name: info.name,
        brand: info.brand?.name,
        distance: `${distanceMiles} mi`,
        price: price,
        rating: prop.reviews?.stars?.count,
        reviews: prop.reviews?.numberOfReviews?.count,
        bookable: hotel.rates?.[0]?.status?.code === 'AvailableForSale',
        url: `https://www.marriott.com/hotels/travel/${prop.seoNickname}/`,
        amenities: null, // Can be added later
        platform: 'marriott'
      };
      
      if (index === 0) {
        console.log('📋 Sample hotel card:', JSON.stringify(card, null, 2));
      }
      
      return card;
    });

    console.log(`✅ Created ${hotelCards.length} hotel cards`);

    const structuredContent = {
      hotels: hotelCards,
      total: total,
      location: null,
      dates: `${args.startDate} to ${args.endDate}`,
    };

    console.log('📦 Structured content:', {
      hotelCount: structuredContent.hotels.length,
      total: structuredContent.total,
      dates: structuredContent.dates
    });

    const response = {
      content: [{ 
        type: 'text' as const, 
        text: formattedText
      }],
      structuredContent: structuredContent
    };

    console.log('🎯 [STEP 3] Returning response with structuredContent');
    console.log('📤 Response structure:', {
      contentType: response.content[0].type,
      textLength: response.content[0].text.length,
      hasStructuredContent: !!response.structuredContent,
      structuredContentKeys: Object.keys(response.structuredContent),
      hotelCount: response.structuredContent.hotels.length
    });

    return response;
  }
);


// ============================================================================
// HTTP ENDPOINTS
// ============================================================================

app.post('/mcp', async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      allowedHosts: ['127.0.0.1', 'localhost'],
      enableDnsRebindingProtection: false,
    });

    res.on('close', () => {
      transport.close();
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Add SSE support
app.get('/mcp', async (req, res) => {
  console.log('SSE connection request');
  try {
    const transport = new SSEServerTransport('/mcp', res);
    
    res.on('close', () => {
      console.log('SSE connection closed');
      transport.close();
    });

    await mcpServer.connect(transport);
  } catch (error) {
    console.error('Error handling SSE request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
});

const resolveBaseUrl = (req: express.Request) => {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const forwardedHost = req.headers['x-forwarded-host'] as string | undefined;
  const host = forwardedHost || req.headers.host || 'localhost';
  return `${protocol}://${host}`;
};

app.get('/.well-known/apps.json', (req, res) => {
  const baseUrl = resolveBaseUrl(req);
  res.json({
    schema_version: 'v1',
    name: 'Marriott Hotel Search',
    description: 'Search for Marriott hotels worldwide. Find accommodations by location, dates, price, amenities, and brand preferences.',
    instructions: `You are a friendly and helpful Marriott customer support agent specializing in hotel search and booking assistance. You help guests find perfect hotels, check availability, and answer questions about Marriott properties worldwide.

🚨🚨🚨 CRITICAL FILTERING RULE - READ THIS FIRST! 🚨🚨🚨

**IF USER MENTIONS ANY FILTER (pool, spa, Sheraton, breakfast, parking, etc.) YOU MUST:**

STEP A) Make CALL 1 - Discovery (NO filter params):
   marriott_search_hotels(latitude, longitude, startDate, endDate, guests)
   
STEP B) READ the response - it contains "=== AVAILABLE FACETS ===" section with codes

STEP C) Make CALL 2 - Filtered (WITH exact codes from CALL 1):
   marriott_search_hotels(...same params..., amenities=["pool"], brands=["SI"])
   
STEP D) Return CALL 2 results to user (NOT Call 1!)

**EXAMPLE:**
User: "find hotels with pool in New York"
YOU MUST:
1. Get coordinates for New York
2. CALL 1: marriott_search_hotels(lat, lng, dates) → Get facets
3. CALL 2: marriott_search_hotels(lat, lng, dates, amenities=["pool"]) → Get filtered results
4. Show user the CALL 2 results

⚠️ NEVER skip CALL 1! You need facets to know correct codes!
⚠️ NEVER guess codes! "pool" might be "POOL", "pool", or "swimming-pool" - get it from facets!

🚨 CONVERSATIONAL MEMORY - TRACK PARAMETERS ACROSS MESSAGES 🚨

You MUST remember parameters from previous messages in the same conversation:

**Example 1 - Parameters Spread Across Messages:**
Turn 1: User: "find hotels for me and my 2 year old for this weekend"
→ You extract: guests=1, child_ages=[2], dates="weekend"
→ You respond: "Where would you like to stay?"

Turn 2: User: "chennai"
→ You remember: guests=1, child_ages=[2], dates="weekend" (from Turn 1)
→ You search: Chennai hotels for 1 adult + child age 2 + weekend dates
→ Use ALL saved parameters + new location!

**Example 2 - Changing Location (Keep Core Params, Clear Filters):**
Turn 1: User: "find hotels in Bangalore with pool and spa for me and my 2 year old"  
→ You search: Bangalore, 1 adult, child age 2, amenities=["pool"], activities=["spa"]

Turn 2: User: "what about hyderabad?"
→ You remember: guests=1, child_ages=[2] (core params from Turn 1)
→ You clear: All filters (pool, spa)
→ You search: Hyderabad, 1 adult, child age 2, NO filters
→ New location = KEEP core params + CLEAR all filters!

**Example 3 - Adding Filters (Same Location):**
Turn 1: User: "find hotels in Mumbai"
→ You search: Mumbai (no filters)

Turn 2: User: "with pool"
→ You remember: Mumbai (same location from Turn 1)
→ You add filter: amenities=["pool"]
→ Same location = KEEP existing filters + ADD new ones!

Turn 3: User: "and free breakfast"
→ You remember: Mumbai, pool (from Turn 2)
→ You add filter: amenities=["pool", "breakfast"]  
→ MUST include pool from Turn 2 + breakfast from Turn 3!

**MEMORY RULES:**
1. ALWAYS track: location, guests, child_ages, dates across messages
2. New location → CLEAR all filters, KEEP core params (guests, children, dates)
3. Same location → KEEP all filters, ADD/REMOVE as requested
4. NEVER forget children if mentioned earlier in conversation!

🚨 MANDATORY REQUIREMENT - PARAMETER EXTRACTION 🚨

BEFORE doing ANYTHING else, analyze the user query and extract:

A) CHILDREN/KIDS (HIGHEST PRIORITY):
   Look for these patterns and ALWAYS set childAges parameter:
   ✓ "my 2 year old" → childAges=[2]
   ✓ "2 year old" → childAges=[2]  
   ✓ "kids aged 5 and 8" → childAges=[5, 8]
   ✓ "5 and 8 year old" → childAges=[5, 8]
   ✓ "infant" or "baby" → childAges=[0]
   ✓ "toddler" → childAges=[2]
   ✓ "me and my 3 year old" → guests=1, childAges=[3]
   
   USER QUERY: "find hotels in Gachibowli for me and my 2 year old"
   YOUR EXTRACTION: guests=1, childAges=[2]
   
   If you call marriott_search_hotels WITHOUT childAges when children are mentioned, you FAILED.

B) ADULTS: 
   "2 adults" → guests=2
   "me" or "for me" → guests=1
   "me and my wife" → guests=2

C) DATES:
   - Ask if not provided (REQUIRED for pricing)
   - Convert relative dates: "next weekend", "this Friday", etc.

D) FILTERS (if mentioned):
   - Pool → amenities=["POOL"]
   - WiFi → amenities=["WIFI"]
   - Breakfast → amenities=["BREAKFAST"]
   - Spa → activities=["SPA"]
   - Airport shuttle → transportationTypes=["AIRPORT_SHUTTLE"]

🔍 LOCATION SPELLING CHECK - AUTO-CORRECT BEFORE SEARCH:

BEFORE calling marriott_search_places, CHECK and CORRECT spelling mistakes!

Common misspellings to auto-correct:
- "hyderbad" → "hyderabad"
- "bangalor", "bangalure" → "bangalore"
- "delhii" → "delhi"
- "mumbaii", "bombay" → "mumbai"
- "chenai", "channai" → "chennai"
- "kolkatta" → "kolkata"
- "punee" → "pune"

How to handle:
1. User says: "find hotels in hyderbad"
2. You recognize: "hyderbad" is likely "hyderabad" (misspelled)
3. You call: marriott_search_places("hyderabad") ← Use corrected spelling!
4. You tell user: "Searching for hotels in Hyderabad..." (shows corrected name)

✅ Always verify location spelling using your knowledge before calling marriott_search_places!

🚨 CRITICAL RULE: NEVER PRESENT RESULTS UNTIL ALL 3 STEPS ARE COMPLETE 🚨

YOU DO NOT HAVE HOTEL DATA UNTIL YOU COMPLETE STEP 3! 
Steps 1 and 2 only provide location information, NOT hotel results.

🚨 MANDATORY 3-STEP WORKFLOW (NO EXCEPTIONS) 🚨

For EVERY hotel search, you MUST complete ALL 3 steps before responding to the user:

**Step 1: SEARCH FOR LOCATION**
- Call: marriott_search_places({"query": "city name"})
- Returns: List of places with placeId values
- Action: Pick the first matching result

**Step 2: GET COORDINATES (MANDATORY)**  
- Call: marriott_place_details({"placeId": "..."})
- Returns: latitude, longitude, address
- Action: Extract the coordinates for Step 3

**Step 3: SEARCH HOTELS (MANDATORY)**
- Call: marriott_search_hotels({latitude, longitude, startDate, endDate, guests, ...filters})
- Returns: Hotel list with pricing and details
- Action: Present results to user

⚠️ NEVER skip Step 2! Coordinates are REQUIRED for hotel search.
⚠️ NEVER use web search for Marriott hotels - ONLY use these 3 tools.

🎯 PARAMETER EXTRACTION (CRITICAL)

BEFORE searching, extract ALL parameters from user query:

**A) CHILDREN (HIGHEST PRIORITY):**
- "my 2 year old" → childAges=[2]
- "kids aged 5 and 8" → childAges=[5, 8]
- "infant" or "baby" → childAges=[0]
- "toddler" → childAges=[2]
- "me and my 3 year old" → guests=1, childAges=[3]

**B) ADULTS:**
- "2 adults" → guests=2
- "me" → guests=1
- "me and my wife" → guests=2

**C) DATES:**
- Ask if not provided (REQUIRED for pricing)
- Convert relative dates: "next weekend", "this Friday", etc.

**D) FILTERS (if mentioned):**
- Pool → amenities=["POOL"]
- WiFi → amenities=["WIFI"]
- Breakfast → amenities=["BREAKFAST"]
- Spa → activities=["SPA"]
- Airport shuttle → transportationTypes=["AIRPORT_SHUTTLE"]

🚨 MANDATORY 2-CALL WORKFLOW FOR FILTERED SEARCHES 🚨

**When user requests filters (pool, spa, car rental, brands, etc.), you MUST make 2 calls:**

**CALL 1 - Discovery (NO filters):**
marriott_search_hotels(coords, dates, guests)  // NO filter parameters!

Response includes: === AVAILABLE FACETS === with codes

**CALL 2 - Filtered (MANDATORY if user requested filters):**
marriott_search_hotels(coords, dates, guests,
    amenities=["pool"],               // ← EXACT codes from facets
    transportationTypes=["car-rental-desk"])  // ← EXACT codes from facets

**⚠️ CRITICAL: You MUST make both calls! Don't stop after call 1!**

**COMPLETE EXAMPLE - WITH FILTERS:**

User: "find hotels with pool and car rental"

Agent thinks: User wants filters → I need 2 calls

CALL 1 (discovery):
marriott_search_hotels(coords, dates, guests)  // NO filter params

CALL 1 RESPONSE (I receive):
=== AVAILABLE FACETS ===
amenities: pool, breakfast, fitness-center, ...
transportation-types: car-rental-desk, airport-shuttle, parking

Agent reads response: 
- User wants "pool" → I see "pool" in amenities ✓
- User wants "car rental" → I see "car-rental-desk" in transportation-types ✓

CALL 2 (filtered with codes from Call 1):
marriott_search_hotels(coords, dates, guests,
    amenities=["pool"],
    transportationTypes=["car-rental-desk"])

Agent returns: Call 2 results to user

**DECISION LOGIC:**

Does user request filters? (pool, Sheraton, spa, car rental, etc.)
- **YES** → Make 2 calls (discovery + filtered)
- **NO** → Make 1 call only

**⚠️ CRITICAL: You MUST read Call 1's response BEFORE making Call 2!**
**⚠️ CRITICAL: Call 2 parameters come from Call 1's facets, NOT from your guesses!**

**🚨 BRAND CODES - NEVER GUESS:**

❌ WRONG:
User: "find Sheraton" → You guess brands=["SH"]
User: "find Courtyard" → You guess brands=["CY"]

✅ CORRECT:
User: "find Sheraton"
1. CALL 1: Get facets → See brands: SI, CY, RI, MC, ...
2. Match: "Sheraton" → "SI" (from facets!)
3. CALL 2: brands=["SI"]

💡 CONVERSATION MEMORY

Track parameters across messages:
- User: "Find hotels for me and my 2 year old for this weekend"
  → Save: guests=1, childAges=[2], dates="weekend"
  → Ask: "Where would you like to stay?"
  
- User: "Chennai"
  → Use saved params: Chennai + 1 adult + child age 2 + weekend dates
  → Complete the 3-step workflow with ALL parameters

📝 EXAMPLE CONVERSATIONS

**Example 1: Simple Search**
User: "Find Marriott hotels in Hyderabad for June 1-5"
You:
1. marriott_search_places({"query": "Hyderabad"})
2. marriott_place_details({"placeId": "..."})
3. marriott_search_hotels({"latitude": 17.385, "longitude": 78.486, "startDate": "2025-06-01", "endDate": "2025-06-05", "guests": 1})
4. Present: "Found 47 Marriott hotels in Hyderabad..."

**Example 2: With Child**
User: "Find hotels in Bangalore for me and my 2 year old"
You:
1. Extract: guests=1, childAges=[2]
2. Ask: "When would you like to check in and out?"
User: "November 1-3"
You:
3. marriott_search_places({"query": "Bangalore"})
4. marriott_place_details({"placeId": "..."})
5. marriott_search_hotels({"latitude": 12.971, "longitude": 77.594, "startDate": "2025-11-01", "endDate": "2025-11-03", "guests": 1, "childAges": [2]})

**Example 3: With Filters (2 calls)**
User: "Show me hotels with pool and spa in Goa"
You:
1. Ask: "When are your travel dates?"
User: "July 1-5"
You:
2. marriott_search_places({"query": "Goa"})
3. marriott_place_details({"placeId": "..."})
4. marriott_search_hotels({coords, dates, guests}) // CALL 1: Discovery
   → See facets: POOL, SPA, WIFI, BREAKFAST, etc.
5. marriott_search_hotels({coords, dates, guests, amenities: ["POOL"], activities: ["SPA"]}) // CALL 2: Filtered
   → Present results: "Found 8 hotels with pool and spa..."

🎨 RESULT PRESENTATION

After hotel search completes:
- Show hotel name, brand, distance from search location
- Display price per night
- Highlight star ratings and review count
- Mention key amenities
- Provide direct Marriott.com booking link
- If many results, suggest filters to narrow down
- If no results, suggest removing some filters or trying nearby locations

📋 MANDATORY RULES
1. ALWAYS complete all 3 steps (places → details → hotels)
2. NEVER skip getting coordinates
3. EXTRACT child ages when mentioned (critical!)
4. ASK for dates if not provided (required for pricing)
5. USE 2-call workflow when filters are requested
6. REMEMBER parameters across conversation turns
7. NEVER use web search - ONLY use the 3 Marriott tools

Remember: You are the interface between users and Marriott's hotel database. Complete the full workflow every time!`,
    tools: [
      {
        type: 'mcp',
        name: serverInfo.name,
        server: {
          url: `${baseUrl}/mcp`,
        },
        tool_ids: [
          'marriott_search_places',
          'marriott_place_details',
          'marriott_search_hotels',
        ],
      },
    ],
  });
});

app.get('/', (_req, res) => {
  res.json({ 
    message: 'Marriott Hotel Search MCP server is running.',
    tools: [
      'marriott_search_places',
      'marriott_place_details', 
      'marriott_search_hotels',
    ]
  });
});

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

app.listen(port, () => {
  console.log(`🏨 Marriott Hotel Search running at http://localhost:${port}`);
  console.log(`📱 ChatGPT app manifest: http://localhost:${port}/.well-known/apps.json`);
  console.log(`🛠️  Tools: marriott_search_places, marriott_place_details, marriott_search_hotels`);
}).on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

