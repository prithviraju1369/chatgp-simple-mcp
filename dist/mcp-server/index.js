#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
const MARRIOTT_SEARCH_API_URL = "https://www.marriott.com/mi/query/phoenixShopSuggestedPlacesQuery";
const MARRIOTT_DETAILS_API_URL = "https://www.marriott.com/mi/query/phoenixShopSuggestedPlacesDetailsQuery";
const MARRIOTT_HOTEL_SEARCH_API_URL = "https://www.marriott.com/mi/query/phoenixShopDatedSearchByGeoQuery";
const SEARCH_PLACES_TOOL = {
    name: "marriott_search_places",
    description: "Search for suggested places on Marriott. Returns place suggestions based on a query string (e.g., city names, destinations).",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Search query for places (e.g., 'new york', 'paris', 'beach')",
            },
        },
        required: ["query"],
    },
};
const PLACE_DETAILS_TOOL = {
    name: "marriott_place_details",
    description: "Get detailed information about a specific place using its place ID. Returns location coordinates, address, place types, and destination information.",
    inputSchema: {
        type: "object",
        properties: {
            placeId: {
                type: "string",
                description: "The Google Maps place ID (obtained from search results)",
            },
        },
        required: ["placeId"],
    },
};
const SEARCH_HOTELS_TOOL = {
    name: "marriott_search_hotels",
    description: "Search for Marriott hotels by location coordinates and dates. Returns available hotels with rates, distance, property details, amenities, and availability.",
    inputSchema: {
        type: "object",
        properties: {
            latitude: {
                type: "number",
                description: "Latitude coordinate of the search location",
            },
            longitude: {
                type: "number",
                description: "Longitude coordinate of the search location",
            },
            startDate: {
                type: "string",
                description: "Check-in date in YYYY-MM-DD format",
            },
            endDate: {
                type: "string",
                description: "Check-out date in YYYY-MM-DD format",
            },
            guests: {
                type: "number",
                description: "Number of adult guests per room (default: 1)",
                default: 1,
            },
            rooms: {
                type: "number",
                description: "Number of rooms (default: 1)",
                default: 1,
            },
            childAges: {
                type: "array",
                description: "Array of children ages (e.g., [2, 5, 10] for 3 children aged 2, 5, and 10). Empty array = no children (default: [])",
                items: { type: "number" },
                default: [],
            },
            distance: {
                type: "number",
                description: "Search radius in meters (default: 80467.2 = 50 miles)",
                default: 80467.2,
            },
            limit: {
                type: "number",
                description: "Maximum number of results to return (default: 20, max: 40 to avoid buffer overflow)",
                default: 20,
            },
            offset: {
                type: "number",
                description: "Offset for pagination (default: 0)",
                default: 0,
            },
            includeTaxesAndFees: {
                type: "boolean",
                description: "Include taxes and fees in rate display (default: false)",
                default: false,
            },
            includeMandatoryFees: {
                type: "boolean",
                description: "Include mandatory fees in rate display (default: false)",
                default: false,
            },
            includeUnavailableProperties: {
                type: "boolean",
                description: "Include properties without availability (default: true)",
                default: true,
            },
            sortBy: {
                type: "string",
                description: "Sort order: DISTANCE, PRICE, RATING (default: DISTANCE)",
                default: "DISTANCE",
                enum: ["DISTANCE", "PRICE", "RATING"],
            },
            sortDirection: {
                type: "string",
                description: "Sort direction: ASC or DESC (default: ASC)",
                default: "ASC",
                enum: ["ASC", "DESC"],
            },
            brands: {
                type: "array",
                description: "Filter by brand codes (e.g., ['MC', 'CY', 'RI'] for Marriott, Courtyard, Residence Inn). Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            amenities: {
                type: "array",
                description: "Filter by amenity codes (e.g., ['POOL', 'WIFI', 'PARKING']). Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            propertyTypes: {
                type: "array",
                description: "Filter by property type codes (e.g., ['HOTEL', 'RESORT']). Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            cities: {
                type: "array",
                description: "Filter by city names. Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            countries: {
                type: "array",
                description: "Filter by country codes (e.g., ['US', 'GB', 'FR']). Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            activities: {
                type: "array",
                description: "Filter by activities (e.g., ['GOLF', 'SKIING', 'WATER_SPORTS']). Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            states: {
                type: "array",
                description: "Filter by state/province codes (e.g., ['NY', 'CA', 'TX']). Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            hotelServiceTypes: {
                type: "array",
                description: "Filter by hotel service types. Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            meetingsEvents: {
                type: "array",
                description: "Filter by meetings & events facilities. Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            transportationTypes: {
                type: "array",
                description: "Filter by transportation types (e.g., ['AIRPORT_SHUTTLE', 'PARKING']). Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            leisureRegions: {
                type: "array",
                description: "Filter by leisure regions. Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
            minPrice: {
                type: "number",
                description: "Minimum price filter in USD (e.g., 100 for $100). Optional.",
            },
            maxPrice: {
                type: "number",
                description: "Maximum price filter in USD (e.g., 300 for $300). Optional.",
            },
            allInclusive: {
                type: "array",
                description: "Filter by all-inclusive properties. Empty array = no filter (default: [])",
                items: { type: "string" },
                default: [],
            },
        },
        required: ["latitude", "longitude", "startDate", "endDate"],
    },
};
async function searchMarriottPlaces(query) {
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
    const requestBody = {
        operationName: "phoenixShopSuggestedPlacesQuery",
        variables: { query },
        query: graphqlQuery,
    };
    const headers = {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Accept-Language": "en-US",
        "apollographql-client-name": "phoenix_homepage",
        "apollographql-client-version": "v1",
        "application-name": "homepage",
        "graphql-operation-name": "phoenixShopSuggestedPlacesQuery",
        "graphql-operation-signature": "70b3555c91797ca8945e4f4b1bdda42c3e37fa1f08fa99feafb73195702c1d34",
        "graphql-require-safelisting": "true",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        "Origin": "https://www.marriott.com",
        "Referer": "https://www.marriott.com/default.mi",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    };
    try {
        const response = await fetch(MARRIOTT_SEARCH_API_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = (await response.json());
        if (data.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }
        if (!data.data?.suggestedPlaces) {
            return "No results found.";
        }
        const places = data.data.suggestedPlaces.edges.map((edge) => edge.node);
        const total = data.data.suggestedPlaces.total;
        if (places.length === 0) {
            return `No places found for query: "${query}"`;
        }
        let result = `Found ${total} suggested place${total !== 1 ? "s" : ""} for "${query}":\n\n`;
        places.forEach((place, index) => {
            result += `${index + 1}. ${place.description}\n`;
            result += `   Primary: ${place.primaryDescription}\n`;
            result += `   Secondary: ${place.secondaryDescription}\n`;
            result += `   Place ID: ${place.placeId}\n\n`;
        });
        return result.trim();
    }
    catch (error) {
        if (error instanceof Error) {
            return `Error searching places: ${error.message}`;
        }
        return "Unknown error occurred while searching places";
    }
}
async function getPlaceDetails(placeId) {
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
    const requestBody = {
        operationName: "phoenixShopSuggestedPlacesDetailsQuery",
        variables: { placeId },
        query: graphqlQuery,
    };
    const headers = {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Accept-Language": "en-US",
        "apollographql-client-name": "phoenix_homepage",
        "apollographql-client-version": "v1",
        "application-name": "homepage",
        "graphql-operation-name": "phoenixShopSuggestedPlacesDetailsQuery",
        "graphql-operation-signature": "0b89c8ea7a6a6408eaee651983d6c7ee168670b727cc5beea980b2d2edfdbe2b",
        "graphql-require-safelisting": "true",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        "Origin": "https://www.marriott.com",
        "Referer": "https://www.marriott.com/default.mi",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    };
    try {
        const response = await fetch(MARRIOTT_DETAILS_API_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = (await response.json());
        if (data.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }
        if (!data.data?.suggestedPlaceDetails) {
            return "Place details not found.";
        }
        const details = data.data.suggestedPlaceDetails;
        const loc = details.location;
        let result = `Place Details:\n\n`;
        result += `Description: ${details.description}\n`;
        result += `Place ID: ${details.placeId}\n`;
        result += `Destination Type: ${details.destinationType}\n`;
        if (details.distance !== null) {
            result += `Distance: ${details.distance}\n`;
        }
        result += `\nLocation:\n`;
        result += `  Address: ${loc.address}\n`;
        result += `  City: ${loc.city}\n`;
        result += `  State: ${loc.state}\n`;
        result += `  Country: ${loc.countryName} (${loc.country})\n`;
        result += `  Coordinates: ${loc.latitude}, ${loc.longitude}\n`;
        if (details.types.length > 0) {
            result += `\nPlace Types: ${details.types.join(", ")}\n`;
        }
        return result.trim();
    }
    catch (error) {
        if (error instanceof Error) {
            return `Error getting place details: ${error.message}`;
        }
        return "Unknown error occurred while getting place details";
    }
}
async function searchHotels(latitude, longitude, startDate, endDate, guests = 1, rooms = 1, childAges = [], distance = 80467.2, limit = 20, // Reduced to avoid buffer overflow
offset = 0, includeTaxesAndFees = false, includeMandatoryFees = false, includeUnavailableProperties = true, sortBy = "DISTANCE", sortDirection = "ASC", brands = [], amenities = [], propertyTypes = [], cities = [], countries = [], activities = [], states = [], hotelServiceTypes = [], meetingsEvents = [], transportationTypes = [], leisureRegions = [], minPrice, maxPrice, allInclusive = []) {
    const graphqlQuery = `query phoenixShopDatedSearchByGeoQuery($search: SearchLowestAvailableRatesByGeolocationInput!, $offset: Int, $limit: Int, $sort: SearchLowestAvailableRatesSort, $filter: [PropertyDescriptionType]) {
  search {
    lowestAvailableRates {
      searchByGeolocation(
        search: $search
        offset: $offset
        limit: $limit
        sort: $sort
      ) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          previousOffset
          currentOffset
          nextOffset
        }
        total
        edges {
          node {
            distance
            property {
              id
              basicInformation {
                isMax
                resort
                isAdultsOnly
                brand {
                  id
                  name
                  type
                }
                name
                nameInDefaultLanguage
                currency
                latitude
                longitude
                bookable
              }
              reviews {
                stars {
                  count
                }
                numberOfReviews {
                  count
                }
              }
              ... on Hotel {
                seoNickname
              }
            }
            rates {
              rateModes {
                ... on SearchLowestAvailableRatesRateModesCash {
                  lowestAverageRate {
                    amount {
                      amount
                      currency
                      decimalPoint
                    }
                    totalAmount {
                      amount
                      currency
                      decimalPoint
                    }
                  }
                }
                ... on SearchLowestAvailableRatesRateModesPoints {
                  pointsPerUnit {
                    points
                  }
                }
              }
              lengthOfStay
              status {
                code
              }
            }
          }
        }
        facets {
          type {
            code
          }
          buckets {
            code
            count
            label
          }
        }
      }
    }
  }
}`;
    // Calculate total number in party (adults + children)
    const numberOfChildren = childAges.length;
    const totalInParty = guests + numberOfChildren;
    const requestBody = {
        operationName: "phoenixShopDatedSearchByGeoQuery",
        variables: {
            search: {
                latitude,
                longitude,
                distance,
                options: {
                    startDate,
                    endDate,
                    rateRequestTypes: [{ type: "STANDARD", value: "" }],
                    numberInParty: totalInParty,
                    ...(childAges.length > 0 && { childAges }), // Only include if children present
                    quantity: rooms,
                    includeMandatoryFees,
                    includeTaxesAndFees,
                    includeUnavailableProperties,
                },
                facets: {
                    terms: [
                        { type: "BRANDS", dimensions: brands },
                        { type: "AMENITIES", dimensions: amenities },
                        { type: "PROPERTY_TYPES", dimensions: propertyTypes },
                        { type: "ACTIVITIES", dimensions: activities },
                        { type: "CITIES", dimensions: cities },
                        { type: "STATES", dimensions: states },
                        { type: "COUNTRIES", dimensions: countries },
                        { type: "HOTEL_SERVICE_TYPES", dimensions: hotelServiceTypes },
                        { type: "MEETINGS_EVENTS", dimensions: meetingsEvents },
                        { type: "TRANSPORTATION_TYPES", dimensions: transportationTypes },
                        { type: "LEISURE_REGIONS", dimensions: leisureRegions },
                        { type: "ALL_INCLUSIVE", dimensions: allInclusive }
                    ],
                    ranges: (() => {
                        const priceEndpoints = minPrice !== undefined || maxPrice !== undefined
                            ? [
                                "0",
                                minPrice?.toString() || "100",
                                maxPrice?.toString() || "200",
                                "overflow"
                            ]
                            : ["0", "100", "200", "overflow"];
                        return [
                            { type: "PRICE", dimensions: [], endpoints: priceEndpoints },
                            { type: "DISTANCE", dimensions: [], endpoints: ["0", "4830", "14520", "80470"] }
                        ];
                    })()
                },
            },
            limit,
            offset,
            sort: {
                fields: [{ field: sortBy, direction: sortDirection }],
            },
            filter: ["HOTEL_MARKETING_CAPTION"],
        },
        query: graphqlQuery,
    };
    const headers = {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Accept-Language": "en-US",
        "apollographql-client-name": "phoenix_shop",
        "apollographql-client-version": "v1",
        "application-name": "shop",
        "graphql-operation-name": "phoenixShopDatedSearchByGeoQuery",
        "graphql-operation-signature": "099bae9b6c5ec6bbe93315a92a3e14f9cb35a35089770ba4036e4e97b564c5be",
        "graphql-require-safelisting": "true",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        "Origin": "https://www.marriott.com",
        "Referer": "https://www.marriott.com/search/findHotels.mi",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    };
    try {
        const response = await fetch(MARRIOTT_HOTEL_SEARCH_API_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = (await response.json());
        if (data.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }
        const searchResults = data.data?.search?.lowestAvailableRates?.searchByGeolocation;
        if (!searchResults || !searchResults.edges || searchResults.edges.length === 0) {
            return `No hotels found near coordinates (${latitude}, ${longitude}) for ${startDate} to ${endDate}`;
        }
        const total = searchResults.total;
        const hotels = searchResults.edges.map((edge) => edge.node);
        let result = `Found ${total} hotel${total !== 1 ? "s" : ""} (showing ${hotels.length}):\n\n`;
        hotels.forEach((hotel, index) => {
            const prop = hotel.property;
            const info = prop.basicInformation;
            const distanceKm = (hotel.distance / 1000).toFixed(1);
            const distanceMiles = (hotel.distance / 1609.34).toFixed(1);
            result += `${index + 1}. ${info.name}\n`;
            if (info.brand) {
                result += `   Brand: ${info.brand.name}\n`;
            }
            result += `   Distance: ${distanceKm} km (${distanceMiles} miles)\n`;
            result += `   Location: ${info.latitude}, ${info.longitude}\n`;
            if (prop.reviews?.stars?.count) {
                result += `   Rating: ${prop.reviews.stars.count} stars`;
                if (prop.reviews?.numberOfReviews?.count) {
                    result += ` (${prop.reviews.numberOfReviews.count} reviews)`;
                }
                result += `\n`;
            }
            // Extract rate information
            if (hotel.rates.rateModes && hotel.rates.rateModes.length > 0) {
                const rateMode = hotel.rates.rateModes[0];
                if (rateMode.lowestAverageRate) {
                    const rate = rateMode.lowestAverageRate;
                    const amount = rate.totalAmount?.amount || rate.amount?.amount;
                    const currency = rate.totalAmount?.currency || rate.amount?.currency;
                    if (amount && currency) {
                        result += `   Rate: ${currency} ${amount.toFixed(2)} per night\n`;
                    }
                }
                else if (rateMode.pointsPerUnit) {
                    result += `   Rate: ${rateMode.pointsPerUnit.points} points per night\n`;
                }
            }
            result += `   Bookable: ${info.bookable ? "Yes" : "No"}\n`;
            result += `   Property ID: ${prop.id}\n`;
            if (prop.seoNickname) {
                result += `   URL: https://www.marriott.com/hotels/travel/${prop.seoNickname}/\n`;
            }
            result += `\n`;
        });
        if (searchResults.pageInfo.hasNextPage) {
            result += `More results available. Total: ${total} hotels.\n`;
        }
        // Add facets to response if no filters were applied (discovery mode)
        const hasFilters = brands.length > 0 || amenities.length > 0 || propertyTypes.length > 0 ||
            cities.length > 0 || countries.length > 0 || activities.length > 0 ||
            states.length > 0 || hotelServiceTypes.length > 0;
        if (!hasFilters && searchResults.facets && searchResults.facets.length > 0) {
            result += `\n\n=== AVAILABLE FACETS FOR FILTERING ===\n`;
            searchResults.facets.forEach((facet) => {
                if (facet.buckets && facet.buckets.length > 0) {
                    const facetType = facet.type?.code || 'unknown';
                    const codes = facet.buckets.slice(0, 20).map((b) => b.code).filter(Boolean);
                    if (codes.length > 0) {
                        result += `\n${facetType}: ${codes.join(', ')}\n`;
                    }
                }
            });
            result += `\n=== USE THESE EXACT CODES IN YOUR NEXT SEARCH ===\n`;
        }
        // Return structured JSON with both text and raw data for UI rendering
        return JSON.stringify({
            text: result.trim(),
            data: data // Include the full GraphQL response for structured extraction
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return `Error searching hotels: ${error.message}`;
        }
        return "Unknown error occurred while searching hotels";
    }
}
const server = new Server({
    name: "marriott-places-mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [SEARCH_PLACES_TOOL, PLACE_DETAILS_TOOL, SEARCH_HOTELS_TOOL],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "marriott_search_places") {
        const query = request.params.arguments?.query;
        if (!query) {
            throw new Error("Query parameter is required");
        }
        const result = await searchMarriottPlaces(query);
        return {
            content: [
                {
                    type: "text",
                    text: result,
                },
            ],
        };
    }
    if (request.params.name === "marriott_place_details") {
        const placeId = request.params.arguments?.placeId;
        if (!placeId) {
            throw new Error("placeId parameter is required");
        }
        const result = await getPlaceDetails(placeId);
        return {
            content: [
                {
                    type: "text",
                    text: result,
                },
            ],
        };
    }
    if (request.params.name === "marriott_search_hotels") {
        const latitude = request.params.arguments?.latitude;
        const longitude = request.params.arguments?.longitude;
        const startDate = request.params.arguments?.startDate;
        const endDate = request.params.arguments?.endDate;
        const guests = request.params.arguments?.guests || 1;
        const rooms = request.params.arguments?.rooms || 1;
        const childAges = request.params.arguments?.childAges || [];
        const distance = request.params.arguments?.distance || 80467.2;
        const limit = request.params.arguments?.limit || 20;
        const offset = request.params.arguments?.offset || 0;
        const includeTaxesAndFees = request.params.arguments?.includeTaxesAndFees ?? false;
        const includeMandatoryFees = request.params.arguments?.includeMandatoryFees ?? false;
        const includeUnavailableProperties = request.params.arguments?.includeUnavailableProperties ?? true;
        const sortBy = request.params.arguments?.sortBy || "DISTANCE";
        const sortDirection = request.params.arguments?.sortDirection || "ASC";
        const brands = request.params.arguments?.brands || [];
        const amenities = request.params.arguments?.amenities || [];
        const propertyTypes = request.params.arguments?.propertyTypes || [];
        const cities = request.params.arguments?.cities || [];
        const countries = request.params.arguments?.countries || [];
        const activities = request.params.arguments?.activities || [];
        const states = request.params.arguments?.states || [];
        const hotelServiceTypes = request.params.arguments?.hotelServiceTypes || [];
        const meetingsEvents = request.params.arguments?.meetingsEvents || [];
        const transportationTypes = request.params.arguments?.transportationTypes || [];
        const leisureRegions = request.params.arguments?.leisureRegions || [];
        const minPrice = request.params.arguments?.minPrice;
        const maxPrice = request.params.arguments?.maxPrice;
        const allInclusive = request.params.arguments?.allInclusive || [];
        if (!latitude || !longitude || !startDate || !endDate) {
            throw new Error("latitude, longitude, startDate, and endDate parameters are required");
        }
        const result = await searchHotels(latitude, longitude, startDate, endDate, guests, rooms, childAges, distance, limit, offset, includeTaxesAndFees, includeMandatoryFees, includeUnavailableProperties, sortBy, sortDirection, brands, amenities, propertyTypes, cities, countries, activities, states, hotelServiceTypes, meetingsEvents, transportationTypes, leisureRegions, minPrice, maxPrice, allInclusive);
        return {
            content: [
                {
                    type: "text",
                    text: result,
                },
            ],
        };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Marriott Places MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
