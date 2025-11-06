#!/usr/bin/env node
/**
 * Integrated Hotel Search MCP Server for ChatGPT
 * Combines Marriott and Airbnb search capabilities
 */
import 'dotenv/config';
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
app.use(cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'Mcp-Session-Id'],
}));
app.use(express.json());
const serverInfo = {
    name: 'marriott-search-assistant',
    version: '1.0.0',
};
const mcpServer = new McpServer(serverInfo);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hotelWidgetPath = path.resolve(__dirname, '../ui/hotel-widget.html');
const hotelDetailsWidgetPath = path.resolve(__dirname, '../ui/hotel-details-widget.html');
let hotelWidgetHtml = '';
let hotelDetailsWidgetHtml = '';
try {
    hotelWidgetHtml = readFileSync(hotelWidgetPath, 'utf8');
    hotelDetailsWidgetHtml = readFileSync(hotelDetailsWidgetPath, 'utf8');
}
catch (error) {
    console.warn('Unable to load widget HTML at startup:', error);
}
// ============================================================================
// MARRIOTT SEARCH TOOLS
// ============================================================================
const MARRIOTT_SEARCH_API_URL = "https://www.marriott.com/mi/query/phoenixShopSuggestedPlacesQuery";
const MARRIOTT_DETAILS_API_URL = "https://www.marriott.com/mi/query/phoenixShopSuggestedPlacesDetailsQuery";
const MARRIOTT_HOTEL_SEARCH_API_URL = "https://www.marriott.com/mi/query/phoenixShopDatedSearchByGeoQuery";
const MARRIOTT_PROPERTY_INFO_API_URL = "https://www.marriott.com/mi/query/phoenixShopHQVPropertyInfoCall";
const MARRIOTT_PHOTOGALLERY_API_URL = "https://www.marriott.com/mi/query/phoenixShopHQVPhotogalleryCall";
const MARRIOTT_AMENITIES_API_URL = "https://www.marriott.com/mi/query/phoenixShopHotelAmenities";
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
    const data = await response.json();
    if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    const places = data.data?.suggestedPlaces?.edges?.map((edge) => edge.node) || [];
    const total = data.data?.suggestedPlaces?.total || 0;
    return { places, total };
}
async function getMarriottPlaceDetails(placeId) {
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
    const data = await response.json();
    if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    return data.data?.suggestedPlaceDetails;
}
// Fetch detailed hotel information from multiple Marriott APIs
async function getMarriottHotelDetails(propertyId) {
    console.log(`🏨 Fetching detailed info for property: ${propertyId}`);
    // Base headers for all requests (operation-specific headers added per request)
    const headers = {
        'accept': '*/*',
        'accept-language': 'en-GB',
        'apollographql-client-name': 'phoenix_shop',
        'apollographql-client-version': 'v1',
        'application-name': 'shop',
        'content-type': 'application/json',
        'graphql-require-safelisting': 'true',
        'origin': 'https://www.marriott.com',
        'referer': 'https://www.marriott.com/en-gb/search/findHotels.mi',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    };
    // Query 1: Property Information
    const propertyInfoQuery = {
        operationName: "phoenixShopHQVPropertyInfoCall",
        variables: {
            propertyId: propertyId,
            filter: "PHONE",
            descriptionsFilter: ["LOCATION"]
        },
        query: `query phoenixShopHQVPropertyInfoCall($propertyId: ID!, $filter: [ContactNumberType], $descriptionsFilter: [PropertyDescriptionType]) {
  property(id: $propertyId) {
    id
    basicInformation {
      name
      currency
      latitude
      longitude
      isAdultsOnly
      isMax
      brand {
        id
        name
      }
      openingDate
      bookable
      resort
      descriptions(filter: $descriptionsFilter) {
        text
        type {
          code
          label
          description
          enumCode
        }
      }
      hasUniquePropertyLogo
      nameInDefaultLanguage
    }
    contactInformation {
      address {
        line1
        city
        postalCode
        stateProvince {
          label
          description
          code
        }
        country {
          code
          description
          label
        }
      }
      contactNumbers(filter: $filter) {
        phoneNumber {
          display
          original
        }
      }
    }
    airports {
      name
      distanceDetails {
        description
      }
      contactNumber {
        phoneNumber {
          display
          original
        }
      }
      url
      complimentaryShuttle
      id
      fees {
        details {
          amount {
            amount
            currency
          }
        }
        type {
          code
          description
        }
      }
    }
    otherTransportation {
      name
      contactInformation {
        phones
      }
      type {
        description
        code
      }
    }
    reviews {
      stars {
        count
      }
      numberOfReviews {
        count
      }
    }
    parking {
      fees {
        fee
        description
      }
      description
    }
    policies {
      checkInTime
      checkOutTime
      smokefree
      petsAllowed
      petsPolicyDescription
      localizedPetsPolicyDescription {
        translatedText
      }
      petsPolicyDetails {
        additionalPetFee
        numberAllowed
        refundableFee
        refundableFeeType
        nonRefundableFee
        nonRefundableFeeType
        additionalPetFeeType
        weightRestricted
        maxWeight
      }
    }
    ... on Hotel {
      seoNickname
    }
  }
}`
    };
    // Query 2: Photo Gallery
    const photoGalleryQuery = {
        operationName: "phoenixShopHQVPhotogalleryCall",
        variables: {
            propertyId: propertyId
        },
        query: `fragment ProductImageConnectionFragmentHQV on ProductImageConnection {
  edges {
    node {
      alternateDescription
      caption
      title
      imageUrls {
        classicHorizontal
      }
    }
  }
}

query phoenixShopHQVPhotogalleryCall($propertyId: ID!) @edgeCachedQuery(desiredMaxAge: 10800) {
  property(id: $propertyId) {
    id
    media {
      photoGallery {
        activities {
          ...ProductImageConnectionFragmentHQV
        }
        dining {
          ...ProductImageConnectionFragmentHQV
        }
        eventsAndMeetings {
          ...ProductImageConnectionFragmentHQV
        }
        features {
          ...ProductImageConnectionFragmentHQV
        }
        golf {
          ...ProductImageConnectionFragmentHQV
        }
        guestRoomFloorPlan {
          ...ProductImageConnectionFragmentHQV
        }
        guestRooms {
          ...ProductImageConnectionFragmentHQV
        }
        hotelView {
          ...ProductImageConnectionFragmentHQV
        }
        nearbyAttractions {
          ...ProductImageConnectionFragmentHQV
        }
        recreationAndFitness {
          ...ProductImageConnectionFragmentHQV
        }
        services {
          ...ProductImageConnectionFragmentHQV
        }
        spa {
          ...ProductImageConnectionFragmentHQV
        }
        suites {
          ...ProductImageConnectionFragmentHQV
        }
        videoTour {
          ...ProductImageConnectionFragmentHQV
        }
        villas {
          ...ProductImageConnectionFragmentHQV
        }
        weddings {
          ...ProductImageConnectionFragmentHQV
        }
      }
      id
    }
  }
}`
    };
    // Query 3: Amenities
    const amenitiesQuery = {
        operationName: "phoenixShopHotelAmenities",
        variables: {
            propertyId: propertyId
        },
        query: `query phoenixShopHotelAmenities($propertyId: ID!) {
  property(id: $propertyId) {
    ... on Hotel {
      id
      facilitiesAndServices {
        type {
          code
          description
        }
        description
        groupId
        groupName
        details {
          key
          value
        }
        categoryType {
          code
          description
        }
      }
      matchingSearchFacets {
        dimension {
          code
          description
        }
      }
    }
  }
}`
    };
    // Make all three API calls in parallel with operation-specific headers
    const [propertyInfoResp, photoGalleryResp, amenitiesResp] = await Promise.all([
        fetch(MARRIOTT_PROPERTY_INFO_API_URL, {
            method: 'POST',
            headers: {
                ...headers,
                'graphql-operation-name': 'phoenixShopHQVPropertyInfoCall',
                'graphql-operation-signature': '2eae8e087811e65ee7e33679d6c53431de528e1db9441d5cc24303eae7a2b633',
            },
            body: JSON.stringify(propertyInfoQuery),
        }),
        fetch(MARRIOTT_PHOTOGALLERY_API_URL, {
            method: 'POST',
            headers: {
                ...headers,
                'graphql-operation-name': 'phoenixShopHQVPhotogalleryCall',
                'graphql-operation-signature': 'db0d761c49558aadfb86728cdd67e50aa6dd5be802f78659a5efe7e079f04dd2',
            },
            body: JSON.stringify(photoGalleryQuery),
        }),
        fetch(MARRIOTT_AMENITIES_API_URL, {
            method: 'POST',
            headers: {
                ...headers,
                'graphql-operation-name': 'phoenixShopHotelAmenities',
                'graphql-operation-signature': '77ebd1ceb8c4eafdb023fffbbc02524b7a4dc414152946846d30294d65115711',
            },
            body: JSON.stringify(amenitiesQuery),
        }),
    ]);
    // Check HTTP status codes first
    console.log('📡 API Response statuses:', {
        propertyInfo: propertyInfoResp.status,
        photoGallery: photoGalleryResp.status,
        amenities: amenitiesResp.status
    });
    if (!propertyInfoResp.ok || !photoGalleryResp.ok || !amenitiesResp.ok) {
        const errors = [];
        if (!propertyInfoResp.ok) {
            const text = await propertyInfoResp.text();
            console.error('❌ Property Info API error:', propertyInfoResp.status, text.substring(0, 500));
            errors.push(`Property Info: ${propertyInfoResp.status} - ${text.substring(0, 200)}`);
        }
        if (!photoGalleryResp.ok) {
            const text = await photoGalleryResp.text();
            console.error('❌ Photo Gallery API error:', photoGalleryResp.status, text.substring(0, 500));
            errors.push(`Photo Gallery: ${photoGalleryResp.status} - ${text.substring(0, 200)}`);
        }
        if (!amenitiesResp.ok) {
            const text = await amenitiesResp.text();
            console.error('❌ Amenities API error:', amenitiesResp.status, text.substring(0, 500));
            errors.push(`Amenities: ${amenitiesResp.status} - ${text.substring(0, 200)}`);
        }
        throw new Error(`API request failed: ${errors.join('; ')}`);
    }
    const [propertyInfo, photoGallery, amenities] = await Promise.all([
        propertyInfoResp.json(),
        photoGalleryResp.json(),
        amenitiesResp.json(),
    ]);
    // Check for GraphQL errors
    if (propertyInfo.errors || photoGallery.errors || amenities.errors) {
        console.error('❌ GraphQL errors:', {
            propertyInfo: propertyInfo.errors,
            photoGallery: photoGallery.errors,
            amenities: amenities.errors,
        });
        throw new Error(`GraphQL errors: ${JSON.stringify({
            propertyInfo: propertyInfo.errors,
            photoGallery: photoGallery.errors,
            amenities: amenities.errors,
        })}`);
    }
    return {
        propertyInfo: propertyInfo.data?.property,
        photoGallery: photoGallery.data?.property?.media?.photoGallery,
        amenities: amenities.data?.property,
    };
}
/**
 * Fetch hotel rates and room availability from Marriott booking API
 */
async function getMarriottHotelRates(propertyId, checkInDate, checkOutDate, rooms = 1, guests = 1) {
    console.log(`🔄 Fetching rates for property ${propertyId} from ${checkInDate} to ${checkOutDate}`);
    const BOOK_PROPERTY_URL = "https://www.marriott.com/mi/query/PhoenixBookProperty";
    const SEARCH_PRODUCTS_URL = "https://www.marriott.com/mi/query/PhoenixBookSearchProductsByProperty";
    const ROOM_IMAGES_URL = "https://www.marriott.com/mi/query/PhoenixBookRoomImages";
    const HOTEL_HEADER_URL = "https://www.marriott.com/mi/query/PhoenixBookHotelHeaderData";
    // Generate slightly varied headers to avoid bot detection
    // Vary user-agent and accept-language slightly to mimic real browser behavior
    const userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    ];
    const acceptLanguages = ['en-GB', 'en-US,en;q=0.9', 'en-US,en;q=0.9,en-GB;q=0.8'];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    const randomAcceptLang = acceptLanguages[Math.floor(Math.random() * acceptLanguages.length)];
    // Generate a random request ID (mimics browser behavior)
    const requestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    // Step 1: Visit landing page first to get Akamai cookies
    // This mimics real browser behavior where you visit the site before making API calls
    console.log('🍪 Visiting landing page to establish session and get cookies...');
    let cookieJar = '';
    try {
        const landingPageResp = await fetch('https://www.marriott.com/en-gb/reservation/rateListMenu.mi', {
            method: 'GET',
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': randomAcceptLang,
                'accept-encoding': 'gzip, deflate, br',
                'user-agent': randomUserAgent,
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
            },
        });
        // Extract cookies from response headers
        // Node.js fetch returns set-cookie as an array
        const setCookieHeaders = [];
        landingPageResp.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
                setCookieHeaders.push(value);
            }
        });
        if (setCookieHeaders.length > 0) {
            cookieJar = setCookieHeaders.map(cookie => {
                // Extract just the name=value part (before the first semicolon)
                return cookie.split(';')[0].trim();
            }).join('; ');
            console.log(`✅ Obtained ${setCookieHeaders.length} cookies from landing page`);
            console.log(`🍪 Cookie jar: ${cookieJar.substring(0, 100)}...`);
        }
        else {
            console.warn('⚠️ No cookies received from landing page');
        }
        // Small delay to mimic human behavior
        // Longer delay after landing page visit to establish session
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    }
    catch (error) {
        console.warn('⚠️ Could not fetch landing page cookies:', error);
        // Continue anyway - cookies might not be critical
    }
    const headers = {
        'accept': '*/*',
        'accept-language': randomAcceptLang,
        'content-type': 'application/json',
        'apollographql-client-name': 'phoenix_book',
        'apollographql-client-version': '1',
        'application-name': 'book',
        'graphql-force-safelisting': 'true',
        'graphql-require-safelisting': 'true',
        'origin': 'https://www.marriott.com',
        'referer': 'https://www.marriott.com/en-gb/reservation/rateListMenu.mi',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': randomUserAgent,
        'priority': 'u=1, i',
        'x-request-id': requestId,
    };
    // Add cookies if we got them
    if (cookieJar) {
        headers['cookie'] = cookieJar;
    }
    // Query 1: Property basic information
    const propertyQuery = {
        operationName: "PhoenixBookProperty",
        variables: { propertyId },
        query: `query PhoenixBookProperty($propertyId: ID!) {
      property(id: $propertyId) {
        ... on Hotel {
          basicInformation {
            ... on HotelBasicInformation {
              descriptions {
                type { code __typename }
                text
                __typename
              }
              isAdultsOnly
              resort
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
    }`
    };
    // Query 2: Room rates and availability
    const searchProductsQuery = {
        operationName: "PhoenixBookSearchProductsByProperty",
        variables: {
            search: {
                options: {
                    startDate: checkInDate,
                    endDate: checkOutDate,
                    quantity: rooms,
                    numberInParty: guests,
                    childAges: [],
                    productRoomType: ["ALL"],
                    productStatusType: ["AVAILABLE"],
                    rateRequestTypes: [
                        { value: "", type: "STANDARD" },
                        { value: "", type: "PREPAY" },
                        { value: "", type: "PACKAGES" },
                        { value: "MRM", type: "CLUSTER" }
                    ],
                    isErsProperty: false
                },
                propertyId
            },
            offset: 0,
            limit: 150
        },
        query: `query PhoenixBookSearchProductsByProperty($search: ProductByPropertySearchInput, $offset: Int, $limit: Int) {
      searchProductsByProperty(search: $search, offset: $offset, limit: $limit) {
        edges {
          node {
            ... on HotelRoom {
              id
              availabilityAttributes {
                rateCategory {
                  type { code __typename }
                  value
                  __typename
                }
                isNearSellout
                __typename
              }
              rates {
                name
                description
                localizedName { translatedText sourceText __typename }
                localizedDescription { translatedText sourceText __typename }
                rateAmounts {
                  amount {
                    origin {
                      amount
                      currency
                      valueDecimalPoint
                      __typename
                    }
                    __typename
                  }
                  points
                  pointsSaved
                  pointsToPurchase
                  __typename
                }
                rateAmountsByMode {
                  averageNightlyRatePerUnit {
                    amount {
                      origin {
                        amount
                        currency
                        valueDecimalPoint
                        __typename
                      }
                      __typename
                    }
                    __typename
                  }
                  __typename
                }
                __typename
              }
              basicInformation {
                type
                name
                localizedName { translatedText __typename }
                description
                localizedDescription { translatedText __typename }
                membersOnly
                oldRates
                representativeRoom
                housingProtected
                actualRoomsAvailable
                depositRequired
                roomsAvailable
                roomsRequested
                ratePlan {
                  ratePlanType
                  ratePlanCode
                  marketCode
                  __typename
                }
                freeCancellationUntil
                __typename
              }
              roomAttributes {
                attributes {
                  id
                  description
                  groupID
                  category {
                    code
                    description
                    __typename
                  }
                  accommodationCategory {
                    code
                    description
                    __typename
                  }
                  __typename
                }
                __typename
              }
              totalPricing {
                quantity
                rateAmountsByMode {
                  grandTotal {
                    amount {
                      origin {
                        value: amount
                        valueDecimalPoint
                        __typename
                      }
                      __typename
                    }
                    __typename
                  }
                  subtotalPerQuantity {
                    amount {
                      origin {
                        currency
                        value: amount
                        valueDecimalPoint
                        __typename
                      }
                      __typename
                    }
                    __typename
                  }
                  totalMandatoryFeesPerQuantity {
                    amount {
                      origin {
                        currency
                        value: amount
                        valueDecimalPoint
                        __typename
                      }
                      __typename
                    }
                    __typename
                  }
                  __typename
                }
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
        total
        status {
          ... on UserInputError {
            httpStatus
            messages {
              user {
                message
                field
                __typename
              }
              __typename
            }
            __typename
          }
          ... on DateRangeTooLongError {
            httpStatus
            messages {
              user {
                message
                field
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
    }`
    };
    // Query 3: Room images
    const roomImagesQuery = {
        operationName: "PhoenixBookRoomImages",
        variables: { propertyId },
        query: `query PhoenixBookRoomImages($propertyId: ID!) {
      property(id: $propertyId) {
        ... on Hotel {
          media {
            photoGallery {
              imagesForAllTags {
                total
                assets {
                  imageUrls {
                    wideHorizontal
                    wideVertical
                    __typename
                  }
                  roomPoolCodes
                  roomTypeCodes
                  title
                  caption
                  sortOrder
                  __typename
                }
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
    }`
    };
    // Query 4: Hotel header data
    const hotelHeaderQuery = {
        operationName: "PhoenixBookHotelHeaderData",
        variables: { propertyId },
        query: `query PhoenixBookHotelHeaderData($propertyId: ID!) {
      property(id: $propertyId) {
        id
        basicInformation {
          latitude
          longitude
          name
          currency
          brand {
            id
            __typename
          }
          __typename
        }
        reviews {
          numberOfReviews {
            count
            description
            __typename
          }
          stars {
            count
            description
            __typename
          }
          __typename
        }
        contactInformation {
          contactNumbers {
            number
            type {
              description
              code
              __typename
            }
            __typename
          }
          address {
            line1
            line2
            line3
            city
            stateProvince {
              description
              __typename
            }
            country {
              description
              code
              __typename
            }
            postalCode
            __typename
          }
          __typename
        }
        ... on Hotel {
          seoNickname
          __typename
        }
        media {
          primaryImage {
            edges {
              node {
                imageUrls {
                  wideHorizontal
                  __typename
                }
                __typename
              }
              __typename
            }
            __typename
          }
          hotelLogo {
            edges {
              node {
                alternateDescription
                imageSrc
                isPrimary
                defaultImage
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
    }`
    };
    // Helper function to extract cookies from response headers
    function extractCookies(headers) {
        const cookies = [];
        headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
                // Extract just the name=value part (before the first semicolon)
                const cookieValue = value.split(';')[0].trim();
                if (cookieValue) {
                    cookies.push(cookieValue);
                }
            }
        });
        return cookies.join('; ');
    }
    // Helper function to merge cookies
    function mergeCookies(existing, newCookies) {
        if (!newCookies)
            return existing;
        if (!existing)
            return newCookies;
        // Combine cookies, avoiding duplicates
        const existingMap = new Map();
        existing.split(';').forEach(c => {
            const [name, ...valueParts] = c.trim().split('=');
            if (name)
                existingMap.set(name, valueParts.join('='));
        });
        newCookies.split(';').forEach(c => {
            const [name, ...valueParts] = c.trim().split('=');
            if (name)
                existingMap.set(name, valueParts.join('='));
        });
        return Array.from(existingMap.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
    }
    // Helper function to fetch with retry logic and better error logging
    async function fetchWithRetry(url, options, maxRetries = 3, cookieJarRef) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Update cookies in options if we have a cookie jar reference
                if (cookieJarRef && cookieJarRef.value) {
                    const currentOptions = options;
                    if (!currentOptions.headers)
                        currentOptions.headers = {};
                    currentOptions.headers['cookie'] = cookieJarRef.value;
                }
                const response = await fetch(url, options);
                // Extract and merge any new cookies from response (even from errors)
                if (cookieJarRef) {
                    const newCookies = extractCookies(response.headers);
                    if (newCookies) {
                        cookieJarRef.value = mergeCookies(cookieJarRef.value || '', newCookies);
                        console.log(`🍪 Updated cookie jar from response (${newCookies.split(';').length} cookies)`);
                    }
                }
                // Log response details for debugging
                let responseText = '';
                let isChallenge = false;
                if (!response.ok) {
                    // Clone response before reading body to avoid consuming it
                    const clonedResponse = response.clone();
                    responseText = await clonedResponse.text().catch(() => 'Unable to read response');
                    // Check for Akamai challenge response
                    try {
                        const responseJson = JSON.parse(responseText);
                        if (responseJson.cpr_chlge === true || responseJson.cpr_chlge === 'true') {
                            isChallenge = true;
                            console.error(`🚫 Akamai Challenge Detected: The server is presenting a bot protection challenge.`);
                            console.error(`   Response: ${responseText}`);
                        }
                    }
                    catch (e) {
                        // Not JSON, ignore
                    }
                    console.error(`❌ API Error (${response.status}):`, {
                        url,
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries()),
                        bodyPreview: responseText.substring(0, 500),
                        isChallenge,
                    });
                }
                // If rate limited (429), check for challenge and handle retry-after intelligently
                if (response.status === 429 && attempt < maxRetries - 1) {
                    const retryAfterHeader = response.headers.get('Retry-After');
                    let retryAfterSeconds = 0;
                    if (retryAfterHeader) {
                        // Handle comma-separated values (e.g., "28800, 28800")
                        const values = retryAfterHeader.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
                        retryAfterSeconds = values.length > 0 ? values[0] : 0;
                    }
                    // Don't retry if retry-after is too long (> 1 hour) or if it's a challenge
                    if (isChallenge || retryAfterSeconds > 3600) {
                        const hours = Math.floor(retryAfterSeconds / 3600);
                        const minutes = Math.floor((retryAfterSeconds % 3600) / 60);
                        console.error(`🚫 Rate limit too severe (${retryAfterSeconds}s = ${hours}h ${minutes}m). Skipping retry.`);
                        console.error(`   This likely indicates bot detection or aggressive rate limiting.`);
                        return response; // Return immediately, don't retry
                    }
                    // For reasonable retry-after values, use them; otherwise use exponential backoff
                    const delay = retryAfterSeconds > 0
                        ? retryAfterSeconds * 1000
                        : Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
                    // Cap delay at 60 seconds max
                    const cappedDelay = Math.min(delay, 60000);
                    console.warn(`⚠️ Rate limited (429). Retrying in ${cappedDelay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, cappedDelay));
                    continue;
                }
                // For 403, try once more with updated cookies (Akamai might set cookies in error response)
                if (response.status === 403 && attempt < maxRetries - 1 && cookieJarRef && cookieJarRef.value) {
                    console.warn(`🚫 Forbidden (403) - Attempting retry with updated cookies... (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
                    continue;
                }
                if (response.status === 403) {
                    console.error(`🚫 Forbidden (403) - Request blocked. This may indicate bot detection.`);
                    console.error(`   Check if headers match browser requirements.`);
                }
                return response;
            }
            catch (error) {
                console.error(`❌ Network error on attempt ${attempt + 1}:`, error);
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
                throw error;
            }
        }
        // If we've exhausted retries, make one final attempt
        return await fetch(url, options);
    }
    // Use a cookie jar reference that can be updated across requests
    const cookieJarRef = { value: cookieJar };
    try {
        // Make API calls sequentially with small delays to avoid rate limiting
        // This mimics real browser behavior where requests aren't perfectly parallel
        console.log('📡 Making API calls with staggered timing to avoid rate limits...');
        const propertyResp = await fetchWithRetry(BOOK_PROPERTY_URL, {
            method: 'POST',
            headers: {
                ...headers,
                'graphql-operation-name': 'PhoenixBookProperty',
                'graphql-operation-signature': '9f165424df22961c9a0d1664c26b9130e2fcf0318bc78c25972cc2e505455376',
            },
            body: JSON.stringify(propertyQuery),
        }, 3, cookieJarRef);
        // Update headers with latest cookies
        if (cookieJarRef.value) {
            headers['cookie'] = cookieJarRef.value;
        }
        // Longer delay between requests to avoid rate limiting (500-1000ms random)
        // This mimics more realistic human browsing behavior
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        const productsResp = await fetchWithRetry(SEARCH_PRODUCTS_URL, {
            method: 'POST',
            headers: {
                ...headers,
                'graphql-operation-name': 'PhoenixBookSearchProductsByProperty',
                'graphql-operation-signature': 'a1079a703a2d21d82c0c65e4337271c3029c69028c6189830f30882170075756',
            },
            body: JSON.stringify(searchProductsQuery),
        }, 3, cookieJarRef);
        // Update headers with latest cookies
        if (cookieJarRef.value) {
            headers['cookie'] = cookieJarRef.value;
        }
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        const imagesResp = await fetchWithRetry(ROOM_IMAGES_URL, {
            method: 'POST',
            headers: {
                ...headers,
                'graphql-operation-name': 'PhoenixBookRoomImages',
                'graphql-operation-signature': '40894e659a54fb0a859b43c02fcfddd48b45a7cab82c4093a2022bb09efd366d',
            },
            body: JSON.stringify(roomImagesQuery),
        }, 3, cookieJarRef);
        // Update headers with latest cookies
        if (cookieJarRef.value) {
            headers['cookie'] = cookieJarRef.value;
        }
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        const headerResp = await fetchWithRetry(HOTEL_HEADER_URL, {
            method: 'POST',
            headers: {
                ...headers,
                'graphql-operation-name': 'PhoenixBookHotelHeaderData',
                'graphql-operation-signature': '40be837690ecfe0509aa28dec18aacd711550258126c658ff0fc06e56603c330',
            },
            body: JSON.stringify(hotelHeaderQuery),
        }, 3, cookieJarRef);
        // Check HTTP status codes with better error messages
        // First, check response bodies for challenge indicators
        const checkForChallenge = async (response) => {
            if (!response.ok) {
                try {
                    const text = await response.text();
                    const json = JSON.parse(text);
                    return json.cpr_chlge === true || json.cpr_chlge === 'true';
                }
                catch {
                    return false;
                }
            }
            return false;
        };
        if (!propertyResp.ok) {
            const isChallenge = await checkForChallenge(propertyResp.clone());
            let errorMsg = '';
            if (isChallenge) {
                errorMsg = 'Bot protection challenge detected: The Marriott website is blocking automated requests. This may require manual intervention or a different approach.';
            }
            else if (propertyResp.status === 429) {
                const retryAfter = propertyResp.headers.get('Retry-After');
                const retrySeconds = retryAfter ? parseInt(retryAfter.split(',')[0].trim(), 10) : 0;
                if (retrySeconds > 3600) {
                    errorMsg = `Rate limited: The service has temporarily blocked requests for ${Math.floor(retrySeconds / 3600)} hours. Please try again later.`;
                }
                else {
                    errorMsg = 'Rate limited: Too many requests. Please try again in a few moments.';
                }
            }
            else if (propertyResp.status === 403) {
                errorMsg = 'Access forbidden (403): The request was blocked. This may be due to bot detection or missing required headers/cookies.';
            }
            else {
                errorMsg = `Property API returned status ${propertyResp.status}`;
            }
            console.error(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }
        if (!productsResp.ok) {
            const isChallenge = await checkForChallenge(productsResp.clone());
            let errorMsg = '';
            if (isChallenge) {
                errorMsg = 'Bot protection challenge detected: The Marriott website is blocking automated requests. This may require manual intervention or a different approach.';
            }
            else if (productsResp.status === 429) {
                const retryAfter = productsResp.headers.get('Retry-After');
                const retrySeconds = retryAfter ? parseInt(retryAfter.split(',')[0].trim(), 10) : 0;
                if (retrySeconds > 3600) {
                    errorMsg = `Rate limited: The service has temporarily blocked requests for ${Math.floor(retrySeconds / 3600)} hours. Please try again later.`;
                }
                else {
                    errorMsg = 'Rate limited: Too many requests. Please try again in a few moments.';
                }
            }
            else if (productsResp.status === 403) {
                errorMsg = 'Access forbidden (403): The request was blocked. This may be due to bot detection or missing required headers/cookies.';
            }
            else {
                errorMsg = `Products API returned status ${productsResp.status}`;
            }
            console.error(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }
        if (!imagesResp.ok) {
            const isChallenge = await checkForChallenge(imagesResp.clone());
            let errorMsg = '';
            if (isChallenge) {
                errorMsg = 'Bot protection challenge detected: The Marriott website is blocking automated requests. This may require manual intervention or a different approach.';
            }
            else if (imagesResp.status === 429) {
                const retryAfter = imagesResp.headers.get('Retry-After');
                const retrySeconds = retryAfter ? parseInt(retryAfter.split(',')[0].trim(), 10) : 0;
                if (retrySeconds > 3600) {
                    errorMsg = `Rate limited: The service has temporarily blocked requests for ${Math.floor(retrySeconds / 3600)} hours. Please try again later.`;
                }
                else {
                    errorMsg = 'Rate limited: Too many requests. Please try again in a few moments.';
                }
            }
            else if (imagesResp.status === 403) {
                errorMsg = 'Access forbidden (403): The request was blocked. This may be due to bot detection or missing required headers/cookies.';
            }
            else {
                errorMsg = `Images API returned status ${imagesResp.status}`;
            }
            console.error(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }
        if (!headerResp.ok) {
            const isChallenge = await checkForChallenge(headerResp.clone());
            let errorMsg = '';
            if (isChallenge) {
                errorMsg = 'Bot protection challenge detected: The Marriott website is blocking automated requests. This may require manual intervention or a different approach.';
            }
            else if (headerResp.status === 429) {
                const retryAfter = headerResp.headers.get('Retry-After');
                const retrySeconds = retryAfter ? parseInt(retryAfter.split(',')[0].trim(), 10) : 0;
                if (retrySeconds > 3600) {
                    errorMsg = `Rate limited: The service has temporarily blocked requests for ${Math.floor(retrySeconds / 3600)} hours. Please try again later.`;
                }
                else {
                    errorMsg = 'Rate limited: Too many requests. Please try again in a few moments.';
                }
            }
            else if (headerResp.status === 403) {
                errorMsg = 'Access forbidden (403): The request was blocked. This may be due to bot detection or missing required headers/cookies.';
            }
            else {
                errorMsg = `Header API returned status ${headerResp.status}`;
            }
            console.error(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }
        const [propertyData, productsData, imagesData, headerData] = await Promise.all([
            propertyResp.json(),
            productsResp.json(),
            imagesResp.json(),
            headerResp.json(),
        ]);
        // Check for GraphQL errors
        if (propertyData.errors || productsData.errors || imagesData.errors || headerData.errors) {
            console.error('❌ GraphQL errors:', {
                property: propertyData.errors,
                products: productsData.errors,
                images: imagesData.errors,
                header: headerData.errors,
            });
            throw new Error(`GraphQL errors: ${JSON.stringify({
                property: propertyData.errors,
                products: productsData.errors,
                images: imagesData.errors,
                header: headerData.errors,
            })}`);
        }
        console.log(`✅ Successfully fetched rates for ${propertyId}`);
        return {
            property: propertyData.data?.property,
            rooms: productsData.data?.searchProductsByProperty,
            images: imagesData.data?.property?.media?.photoGallery,
            header: headerData.data?.property,
        };
    }
    catch (error) {
        console.error('❌ Error fetching hotel rates:', error);
        throw error;
    }
}
// ============================================================================
// REGISTER HOTEL WIDGET
// ============================================================================
mcpServer.registerResource('hotel-results-widget', 'ui://widget/hotel-results.html', {}, async () => {
    let html = hotelWidgetHtml;
    try {
        html = readFileSync(hotelWidgetPath, 'utf8');
    }
    catch (error) {
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
                        resource_domains: [
                            'https://www.marriott.com',
                            'https://cache.marriott.com',
                        ],
                    },
                },
            },
        ],
    };
});
mcpServer.registerResource('hotel-details-widget', 'ui://widget/hotel-details.html', {}, async () => {
    let html = hotelDetailsWidgetHtml;
    try {
        html = readFileSync(hotelDetailsWidgetPath, 'utf8');
    }
    catch (error) {
        if (!html) {
            throw error;
        }
        console.warn('Falling back to cached hotel details widget HTML:', error);
    }
    return {
        contents: [
            {
                uri: 'ui://widget/hotel-details.html',
                mimeType: 'text/html+skybridge',
                text: html,
                _meta: {
                    'openai/widgetDescription': 'Displays detailed information about a specific Marriott hotel including photos, amenities, location, and policies.',
                    'openai/widgetPrefersBorder': true,
                    'openai/widgetCSP': {
                        connect_domains: [],
                        resource_domains: [
                            'https://www.marriott.com',
                            'https://cache.marriott.com',
                        ],
                    },
                },
            },
        ],
    };
});
// ============================================================================
// REGISTER MARRIOTT TOOLS
// ============================================================================
mcpServer.registerTool('marriott_search_places', {
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
}, async (args) => {
    console.log('\n🟢 [STEP 1] marriott_search_places CALLED');
    console.log('📥 Query:', args.query);
    const result = await searchMarriottPlaces(args.query);
    console.log(`✅ [STEP 1] Found ${result.total} location(s)`);
    console.log('📍 First place:', result.places[0]);
    const firstPlaceId = result.places[0]?.placeId || '';
    return {
        content: [{
                type: 'text',
                text: `✅ Step 1/3 Complete - Found ${result.total} location(s)

⚠️ NO HOTEL DATA YET - This is just a list of matching places.

🔴 MANDATORY NEXT STEP - Call marriott_place_details with:
- placeId: ${firstPlaceId}

DO NOT stop here. Continue to Step 2 immediately.

Location Options:\n${JSON.stringify(result, null, 2)}`
            }],
        structuredContent: result,
    };
});
mcpServer.registerTool('marriott_place_details', {
    title: '[STEP 2/3] Get Coordinates for Location',
    description: 'REQUIRED SECOND STEP: Get latitude and longitude coordinates for a place. Takes placeId from marriott_search_places results. After getting coordinates, you MUST call marriott_search_hotels with these coordinates. DO NOT skip to web search - coordinates are REQUIRED for hotel search.',
    inputSchema: {
        placeId: z.string().describe('Place ID obtained from marriott_search_places results'),
    },
    outputSchema: {
        placeId: z.string(),
        description: z.string().nullable(),
        location: z.object({
            latitude: z.number().nullable(),
            longitude: z.number().nullable(),
            address: z.string().nullable(),
            city: z.string().nullable(),
            state: z.string().nullable(),
            country: z.string().nullable(),
        }),
    },
    annotations: {
        readOnlyHint: true,
    },
}, async (args) => {
    console.log('\n🟡 [STEP 2] marriott_place_details CALLED');
    console.log('📥 PlaceId:', args.placeId);
    const result = await getMarriottPlaceDetails(args.placeId);
    console.log(`✅ [STEP 2] Got coordinates: ${result.location.latitude}, ${result.location.longitude}`);
    console.log('📍 Location:', result.location);
    // Check if coordinates are valid
    if (result.location.latitude === null || result.location.longitude === null) {
        return {
            content: [{
                    type: 'text',
                    text: `❌ Error: Unable to get coordinates for this location.

The place ID "${args.placeId}" returned no valid coordinates. This location may not be precise enough for hotel searches.

Please try:
1. Being more specific (e.g., "Times Square, New York" instead of just "New York")
2. Using a different location format
3. Trying a nearby city or landmark

Location data received:\n${JSON.stringify(result, null, 2)}`
                }],
            structuredContent: result,
        };
    }
    return {
        content: [{
                type: 'text',
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
});
mcpServer.registerTool('marriott_search_hotels', {
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
        page: z.number().optional().default(1).describe('Page number for pagination (5 results per page, starting from 1)'),
        // Filter parameters
        brands: z.array(z.string()).optional().default([]).describe('Filter by brand codes (e.g., ["MC", "CY"])'),
        amenities: z.array(z.string()).optional().default([]).describe('Filter by amenities (e.g., ["pool", "wifi"])'),
        activities: z.array(z.string()).optional().default([]).describe('Filter by activities (e.g., ["spa", "golf"])'),
        transportationTypes: z.array(z.string()).optional().default([]).describe('Filter by transportation types'),
        propertyTypes: z.array(z.string()).optional().default([]).describe('Filter by property types'),
        cities: z.array(z.string()).optional().default([]).describe('Filter by city names'),
        states: z.array(z.string()).optional().default([]).describe('Filter by state/province codes'),
        countries: z.array(z.string()).optional().default([]).describe('Filter by country codes'),
        meetingsAndEvents: z.array(z.string()).optional().default([]).describe('Filter by meetings & events options'),
        hotelServiceTypes: z.array(z.string()).optional().default([]).describe('Filter by hotel service types'),
        leisureRegion: z.array(z.string()).optional().default([]).describe('Filter by leisure regions'),
        allInclusive: z.array(z.string()).optional().default([]).describe('Filter by all-inclusive options'),
    },
    annotations: {
        readOnlyHint: true,
        componentInitiatedHint: true, // Allow widget to call this tool directly
    },
    _meta: {
        'openai/outputTemplate': 'ui://widget/hotel-results.html',
        'openai/widgetAccessible': true,
        'openai/toolInvocation/invoking': 'Searching Marriott hotels...',
        'openai/toolInvocation/invoked': 'Found hotels! Displaying results.',
    },
}, async (args) => {
    console.log('\n🔵 [STEP 3] marriott_search_hotels CALLED');
    console.log('📥 Input arguments:', JSON.stringify(args, null, 2));
    // 🎯 PAGINATION: Convert page number to offset
    const ITEMS_PER_PAGE = 5;
    const page = args.page || 1;
    const offset = (page - 1) * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE; // Always fetch 5 results per API call
    console.log(`📄 Pagination: page=${page}, offset=${offset}, limit=${limit}`);
    // 🎯 AUTOMATIC FILTER DETECTION & ENFORCEMENT
    // Track if this location has been searched before
    const locationKey = `${args.latitude},${args.longitude}`;
    const lastSearchKey = global.__lastSearchLocation;
    const isNewLocation = lastSearchKey !== locationKey;
    // Detect if user is trying to use filters
    const hasFilters = (args.brands && args.brands.length > 0) ||
        (args.amenities && args.amenities.length > 0) ||
        (args.activities && args.activities.length > 0) ||
        (args.transportationTypes && args.transportationTypes.length > 0) ||
        (args.propertyTypes && args.propertyTypes.length > 0) ||
        (args.cities && args.cities.length > 0) ||
        (args.states && args.states.length > 0) ||
        (args.countries && args.countries.length > 0) ||
        (args.meetingsAndEvents && args.meetingsAndEvents.length > 0) ||
        (args.hotelServiceTypes && args.hotelServiceTypes.length > 0) ||
        (args.leisureRegion && args.leisureRegion.length > 0) ||
        (args.allInclusive && args.allInclusive.length > 0);
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
                    type: 'text',
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
        global.__lastSearchLocation = locationKey;
        console.log('✅ Discovery call made for location:', locationKey);
    }
    else {
        console.log('✅ Filtered call made (after discovery) for location:', locationKey);
    }
    // Call the local Marriott MCP server via subprocess
    const marriottPath = '/Users/prithvirajuuppalapati/Documents/agentic-travel-chat/mcp-local-main/dist/index.js';
    console.log('🔧 Spawning subprocess:', marriottPath);
    const result = await new Promise((resolve, reject) => {
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
                    }
                    catch (e) {
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
            if (stderr)
                console.error('🔴 Subprocess stderr output:', stderr);
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
            // Build arguments with pagination parameters
            const toolArgs = {
                ...args,
                offset: offset, // Pass calculated offset to MCP server
                limit: limit, // Pass limit (5) to MCP server
            };
            // Remove page parameter (MCP server uses offset, not page)
            delete toolArgs.page;
            const toolMsg = {
                jsonrpc: '2.0',
                id: jsonrpcId,
                method: 'tools/call',
                params: { name: 'marriott_search_hotels', arguments: toolArgs }
            };
            console.log('📨 Sending tool call with offset/limit:', toolMsg);
            proc.stdin.write(JSON.stringify(toolMsg) + '\n');
        }, 500);
    });
    // Parse the result to extract structured data
    console.log('🔍 Parsing result, length:', result.length);
    let parsedData = null;
    try {
        parsedData = JSON.parse(result);
        console.log('✅ Successfully parsed JSON data');
        console.log('📊 Data structure keys:', Object.keys(parsedData));
    }
    catch (e) {
        console.error('❌ Failed to parse JSON result:', e);
        console.error('📄 Raw result (first 500 chars):', result.substring(0, 500));
        // Check if it's a "no hotels found" message
        if (result.toLowerCase().includes('no hotels found')) {
            // Build a message showing what filters were applied
            const appliedFilters = [];
            if (args.brands && args.brands.length > 0)
                appliedFilters.push(`Brands: ${args.brands.join(', ')}`);
            if (args.amenities && args.amenities.length > 0)
                appliedFilters.push(`Amenities: ${args.amenities.join(', ')}`);
            if (args.activities && args.activities.length > 0)
                appliedFilters.push(`Activities: ${args.activities.join(', ')}`);
            if (args.transportationTypes && args.transportationTypes.length > 0)
                appliedFilters.push(`Transportation: ${args.transportationTypes.join(', ')}`);
            if (args.propertyTypes && args.propertyTypes.length > 0)
                appliedFilters.push(`Property Types: ${args.propertyTypes.join(', ')}`);
            let message = '❌ No hotels found matching your criteria.\n\n';
            if (appliedFilters.length > 0) {
                message += '🔍 **Active Filters:**\n';
                appliedFilters.forEach(filter => {
                    message += `  • ${filter}\n`;
                });
                message += '\n💡 **Suggestions:**\n';
                message += '  • Try removing some filters\n';
                message += '  • Adjust your dates\n';
                message += '  • Search a different location\n';
            }
            else {
                message += '💡 Try adjusting your dates or searching a different location.';
            }
            return {
                content: [{ type: 'text', text: message }],
            };
        }
        // If not JSON and not a "no hotels" message, return as-is
        return {
            content: [{ type: 'text', text: result }],
        };
    }
    // Format hotels in a clean, card-like text format
    const hotels = parsedData.data?.data?.search?.lowestAvailableRates?.searchByGeolocation?.edges || [];
    const total = parsedData.data?.data?.search?.lowestAvailableRates?.searchByGeolocation?.total || 0;
    const pageInfo = parsedData.data?.data?.search?.lowestAvailableRates?.searchByGeolocation?.pageInfo;
    console.log(`📍 API returned ${hotels.length} hotels (total available: ${total})`);
    console.log(`📄 Page info:`, pageInfo);
    if (hotels.length === 0) {
        console.warn('⚠️ No hotels found in result');
        // Build a message showing what filters were applied
        const appliedFilters = [];
        if (args.brands && args.brands.length > 0)
            appliedFilters.push(`Brands: ${args.brands.join(', ')}`);
        if (args.amenities && args.amenities.length > 0)
            appliedFilters.push(`Amenities: ${args.amenities.join(', ')}`);
        if (args.activities && args.activities.length > 0)
            appliedFilters.push(`Activities: ${args.activities.join(', ')}`);
        if (args.transportationTypes && args.transportationTypes.length > 0)
            appliedFilters.push(`Transportation: ${args.transportationTypes.join(', ')}`);
        if (args.propertyTypes && args.propertyTypes.length > 0)
            appliedFilters.push(`Property Types: ${args.propertyTypes.join(', ')}`);
        let message = '❌ No hotels found matching your criteria.\n\n';
        if (appliedFilters.length > 0) {
            message += '🔍 **Active Filters:**\n';
            appliedFilters.forEach(filter => {
                message += `  • ${filter}\n`;
            });
            message += '\n💡 **Suggestions:**\n';
            message += '  • Try removing some filters\n';
            message += '  • Adjust your dates\n';
            message += '  • Search a different location\n';
        }
        else {
            message += '💡 Try adjusting your dates or searching a different location.';
        }
        return {
            content: [{ type: 'text', text: message }],
        };
    }
    // ✂️ TRUE SERVER-SIDE PAGINATION: API already returned exactly 5 (or fewer) results
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const startIdx = offset + 1; // Display index (1-based)
    const endIdx = offset + hotels.length;
    console.log(`📄 Pagination: page ${page}/${totalPages}, showing hotels ${startIdx}-${endIdx} of ${total} total`);
    // Minimal text - widget shows all details
    // Create a reference list of hotels with property IDs for ChatGPT to use
    const formattedText = `📋 SEARCH RESULTS REFERENCE (use these property IDs for details):

${hotels.map((edge, index) => {
        const hotel = edge.node;
        return `${startIdx + index}. "${hotel?.basicInformation?.name}" - Property ID: ${hotel?.id}`;
    }).join('\n')}

${total > ITEMS_PER_PAGE ? `\n... showing ${hotels.length} of ${total} total results (page ${page}/${totalPages})` : ''}

⚠️ IMPORTANT: When user asks for details about a hotel, use the EXACT Property ID from this list with marriott_hotel_details tool.`;
    // Prepare structured data for widget
    console.log('🎨 Creating structured hotel cards...');
    const hotelCards = hotels.map((edge, index) => {
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
        // Extract image URL
        let imageUrl = null;
        const primaryImage = prop.media?.primaryImage?.edges?.[0]?.node;
        if (primaryImage?.imageUrls) {
            // Use wideHorizontal for best quality, fallback to classicHorizontal
            const relativeUrl = primaryImage.imageUrls.wideHorizontal ||
                primaryImage.imageUrls.classicHorizontal ||
                primaryImage.imageUrls.square;
            if (relativeUrl) {
                // Marriott images are hosted on cache.marriott.com
                imageUrl = relativeUrl.startsWith('http')
                    ? relativeUrl
                    : `https://cache.marriott.com${relativeUrl}`;
            }
        }
        const card = {
            id: prop.id, // Property ID (e.g., "NYCAK") - needed for hotel details
            name: info.name,
            brand: info.brand?.name,
            distance: `${distanceMiles} mi`,
            price: price,
            rating: prop.reviews?.stars?.count,
            reviews: prop.reviews?.numberOfReviews?.count,
            bookable: hotel.rates?.[0]?.status?.code === 'AvailableForSale',
            url: `https://www.marriott.com/hotels/travel/${prop.seoNickname}/`,
            image: imageUrl,
            amenities: null, // Can be added later
            platform: 'marriott'
        };
        if (index === 0) {
            console.log('📋 Sample hotel card:', JSON.stringify(card, null, 2));
        }
        return card;
    });
    console.log(`✅ Created ${hotelCards.length} hotel cards`);
    // Extract facets from the API response for widget
    const facetsForWidget = parsedData.data?.data?.search?.lowestAvailableRates?.searchByGeolocation?.facets || [];
    console.log(`📊 Facets for widget: ${facetsForWidget.length}`);
    if (facetsForWidget.length > 0) {
        console.log('📊 First facet type:', facetsForWidget[0]?.type?.code);
        console.log('📊 Facet types:', facetsForWidget.map((f) => f.type?.code).join(', '));
    }
    else {
        console.warn('⚠️ No facets in API response!');
    }
    const structuredContent = {
        hotels: hotelCards,
        total: total,
        location: null,
        dates: `${args.startDate} to ${args.endDate}`,
        facets: facetsForWidget, // Include facets for filtering
        pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalResults: total, // Total from API, not local array length
            perPage: ITEMS_PER_PAGE,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
        // Store search parameters for widget to use in pagination calls
        searchParams: {
            latitude: args.latitude,
            longitude: args.longitude,
            startDate: args.startDate,
            endDate: args.endDate,
            guests: args.guests,
            rooms: args.rooms,
            childAges: args.childAges,
            brands: args.brands,
            amenities: args.amenities,
            activities: args.activities,
        }
    };
    console.log('📦 Structured content:', {
        hotelCount: structuredContent.hotels.length,
        total: structuredContent.total,
        dates: structuredContent.dates,
        facetsCount: structuredContent.facets.length
    });
    const response = {
        content: [{
                type: 'text',
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
});
mcpServer.registerTool('marriott_hotel_details', {
    title: 'Get Detailed Hotel Information',
    description: `Get comprehensive details about a specific Marriott hotel including property information, photo gallery, and amenities. 

🚨 CRITICAL: PROPERTY ID MUST COME FROM SEARCH RESULTS 🚨

When user asks for hotel details:
1. Look at the "SEARCH RESULTS REFERENCE" section from the previous marriott_search_hotels response
2. Find the hotel name the user mentioned
3. Extract the EXACT Property ID listed for that hotel
4. Use that Property ID in this tool

❌ DO NOT:
- Try to guess or construct property IDs
- Use abbreviations or city codes as property IDs
- Make assumptions about what the property ID might be

✅ DO:
- ALWAYS get the property ID from the previous search results
- Match the hotel name exactly to find the correct property ID
- If the property ID is not in previous results, tell the user you need to search first

Example:
User: "show me hotels in Times Square"
→ marriott_search_hotels returns reference list with: "The Algonquin Hotel" - Property ID: NYCAK
User: "get more details on The Algonquin Hotel"  
→ You extract "NYCAK" from the reference list
→ marriott_hotel_details({"propertyId": "NYCAK"})

Property IDs are always uppercase letters (4-5 chars), like: NYCAK, BOMCY, NYCMD, NYCWI, etc.`,
    inputSchema: {
        propertyId: z.string().describe('Hotel property ID (e.g., "NYCAK"). Extract this from previous search results.'),
    },
    annotations: {
        readOnlyHint: true,
    },
    _meta: {
        'openai/outputTemplate': 'ui://widget/hotel-details.html',
        'openai/widgetAccessible': true,
        'openai/toolInvocation/invoking': 'Loading hotel details...',
        'openai/toolInvocation/invoked': 'Hotel details loaded!',
    },
}, async (args) => {
    console.log('\n🏨 marriott_hotel_details CALLED');
    console.log('📥 Property ID:', args.propertyId);
    try {
        const details = await getMarriottHotelDetails(args.propertyId);
        console.log('✅ Hotel details retrieved successfully');
        const property = details.propertyInfo;
        const photoGallery = details.photoGallery;
        const amenities = details.amenities;
        // Format a comprehensive text summary
        let formattedText = `🏨 **${property?.basicInformation?.name || 'Hotel'}**\n\n`;
        // Basic Information
        formattedText += `**Brand:** ${property?.basicInformation?.brand?.name || 'N/A'}\n`;
        formattedText += `**Location:** ${property?.contactInformation?.address?.line1 || ''}, ${property?.contactInformation?.address?.city || ''}, ${property?.contactInformation?.address?.stateProvince?.code || ''} ${property?.contactInformation?.address?.postalCode || ''}\n`;
        formattedText += `**Country:** ${property?.contactInformation?.address?.country?.description || 'N/A'}\n`;
        if (property?.contactInformation?.contactNumbers?.[0]?.phoneNumber?.display) {
            formattedText += `**Phone:** ${property.contactInformation.contactNumbers[0].phoneNumber.display}\n`;
        }
        if (property?.basicInformation?.descriptions?.[0]?.text) {
            formattedText += `\n**About:**\n${property.basicInformation.descriptions[0].text}\n`;
        }
        // Reviews
        if (property?.reviews) {
            formattedText += `\n**Rating:** ${property.reviews.stars?.count || 'N/A'} stars (${property.reviews.numberOfReviews?.count || 0} reviews)\n`;
        }
        // Policies
        if (property?.policies) {
            formattedText += `\n**Check-in:** ${property.policies.checkInTime || 'N/A'}\n`;
            formattedText += `**Check-out:** ${property.policies.checkOutTime || 'N/A'}\n`;
            formattedText += `**Smoke-free:** ${property.policies.smokefree ? 'Yes' : 'No'}\n`;
            formattedText += `**Pets allowed:** ${property.policies.petsAllowed ? 'Yes' : 'No'}\n`;
            if (property.policies.petsAllowed && property.policies.petsPolicyDescription) {
                formattedText += `  - ${property.policies.petsPolicyDescription}\n`;
            }
        }
        // Parking
        if (property?.parking && property.parking.length > 0) {
            formattedText += `\n**Parking:**\n`;
            property.parking.forEach((p) => {
                if (p.fees?.description) {
                    formattedText += `  - ${p.fees.description}\n`;
                }
            });
        }
        // Airports
        if (property?.airports && property.airports.length > 0) {
            formattedText += `\n**Nearby Airports:**\n`;
            property.airports.slice(0, 3).forEach((airport) => {
                formattedText += `  - ${airport.name || ''} (${airport.id || ''}) - ${airport.distanceDetails?.description || 'N/A'}`;
                if (airport.complimentaryShuttle) {
                    formattedText += ` - Complimentary shuttle available`;
                }
                formattedText += `\n`;
            });
        }
        // Key Amenities
        if (amenities?.matchingSearchFacets && amenities.matchingSearchFacets.length > 0) {
            formattedText += `\n**Key Amenities:**\n`;
            amenities.matchingSearchFacets.slice(0, 10).forEach((facet) => {
                if (facet.dimension?.description) {
                    formattedText += `  • ${facet.dimension.description}\n`;
                }
            });
        }
        // Photo Gallery Summary
        let photoCount = 0;
        if (photoGallery) {
            Object.keys(photoGallery).forEach((category) => {
                if (photoGallery[category]?.edges) {
                    photoCount += photoGallery[category].edges.length;
                }
            });
            if (photoCount > 0) {
                formattedText += `\n**Photo Gallery:** ${photoCount} photos available across multiple categories\n`;
            }
        }
        return {
            content: [{
                    type: 'text',
                    text: formattedText
                }],
            structuredContent: {
                propertyId: args.propertyId,
                propertyInfo: property,
                photoGallery: photoGallery,
                amenities: amenities,
            },
        };
    }
    catch (error) {
        console.error('❌ Error fetching hotel details:', error);
        return {
            content: [{
                    type: 'text',
                    text: `Error fetching hotel details: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
        };
    }
});
// ============================================================================
// HOTEL RATES TOOL
// ============================================================================
mcpServer.registerTool('marriott_hotel_rates', {
    title: 'Get Hotel Room Rates and Availability',
    description: `Get available room types, rates, and booking information for a specific Marriott hotel.

🚨 CRITICAL: PROPERTY ID MUST COME FROM SEARCH RESULTS 🚨

This tool fetches:
- All available room types and descriptions
- Nightly rates and total pricing
- Room amenities and features
- Room images
- Cancellation policies
- Member-only rates and special offers

When user asks for rates/prices:
1. Extract the Property ID from previous marriott_search_hotels results
2. Use the check-in and check-out dates the user mentioned
3. Call this tool with those parameters

**Example:**
User: "What are the rates for The Algonquin Hotel for Nov 15-17?"
→ Find "The Algonquin Hotel Times Square, Autograph Collection" in previous search results
→ Extract Property ID: NYCAK
→ Call: marriott_hotel_rates({"propertyId": "NYCAK", "checkInDate": "2025-11-15", "checkOutDate": "2025-11-17"})

Date format: YYYY-MM-DD`,
    inputSchema: {
        propertyId: z.string().describe('Hotel property ID from search results (e.g., "NYCAK")'),
        checkInDate: z.string().describe('Check-in date in YYYY-MM-DD format (e.g., "2025-11-15")'),
        checkOutDate: z.string().describe('Check-out date in YYYY-MM-DD format (e.g., "2025-11-17")'),
        rooms: z.number().optional().describe('Number of rooms (default: 1)'),
        guests: z.number().optional().describe('Number of guests (default: 1)'),
    },
    annotations: {
        readOnlyHint: true,
    },
}, async (args) => {
    console.log('\n💰 marriott_hotel_rates CALLED');
    console.log('📥 Parameters:', args);
    try {
        const ratesData = await getMarriottHotelRates(args.propertyId, args.checkInDate, args.checkOutDate, args.rooms || 1, args.guests || 1);
        console.log('✅ Hotel rates retrieved successfully');
        const property = ratesData.property;
        const rooms = ratesData.rooms;
        const images = ratesData.images;
        const header = ratesData.header;
        // Build formatted text response
        let formattedText = `# ${header?.basicInformation?.name || 'Hotel'} - Room Rates\n\n`;
        // Hotel Info
        if (header?.contactInformation?.address) {
            const addr = header.contactInformation.address;
            formattedText += `**Location:** ${addr.line1}, ${addr.city}, ${addr.stateProvince?.description || ''} ${addr.postalCode}\n`;
        }
        if (header?.reviews) {
            formattedText += `**Rating:** ${header.reviews.stars?.count || 'N/A'}/5 (${header.reviews.numberOfReviews?.count || 0} reviews)\n`;
        }
        formattedText += `\n**Check-in:** ${args.checkInDate}\n`;
        formattedText += `**Check-out:** ${args.checkOutDate}\n`;
        formattedText += `**Guests:** ${args.guests || 1}\n\n`;
        // Room Options
        if (rooms?.edges && rooms.edges.length > 0) {
            formattedText += `## Available Room Options (${rooms.total} total)\n\n`;
            rooms.edges.slice(0, 10).forEach((edge, index) => {
                const room = edge.node;
                const info = room.basicInformation;
                const pricing = room.totalPricing;
                const rates = room.rates;
                formattedText += `### ${index + 1}. ${info.localizedName?.translatedText || info.name}\n`;
                formattedText += `**Description:** ${info.localizedDescription?.translatedText || info.description}\n`;
                // Price
                if (pricing?.rateAmountsByMode?.grandTotal) {
                    const total = pricing.rateAmountsByMode.grandTotal.amount.origin.value;
                    const decimal = pricing.rateAmountsByMode.grandTotal.amount.origin.valueDecimalPoint;
                    const currency = pricing.rateAmountsByMode.subtotalPerQuantity.amount.origin.currency || 'USD';
                    const totalPrice = (total / Math.pow(10, decimal)).toFixed(2);
                    formattedText += `**Total Price:** ${currency} ${totalPrice}\n`;
                }
                // Nightly Rate
                if (rates?.rateAmountsByMode?.averageNightlyRatePerUnit) {
                    const nightly = rates.rateAmountsByMode.averageNightlyRatePerUnit.amount.origin.amount;
                    const decimal = rates.rateAmountsByMode.averageNightlyRatePerUnit.amount.origin.valueDecimalPoint;
                    const currency = rates.rateAmountsByMode.averageNightlyRatePerUnit.amount.origin.currency || 'USD';
                    const nightlyPrice = (nightly / Math.pow(10, decimal)).toFixed(2);
                    formattedText += `**Average Nightly Rate:** ${currency} ${nightlyPrice}\n`;
                }
                // Rate Type
                if (rates?.localizedName?.translatedText) {
                    formattedText += `**Rate Plan:** ${rates.localizedName.translatedText}\n`;
                }
                // Cancellation
                if (info.freeCancellationUntil) {
                    const cancelDate = new Date(info.freeCancellationUntil).toLocaleDateString();
                    formattedText += `**Free Cancellation Until:** ${cancelDate}\n`;
                }
                // Availability
                if (room.availabilityAttributes?.isNearSellout) {
                    formattedText += `⚠️ **Only a few rooms left at this price**\n`;
                }
                // Members Only
                if (info.membersOnly) {
                    formattedText += `🏆 **Members Only Rate**\n`;
                }
                formattedText += `\n`;
            });
        }
        else {
            formattedText += `\n**No rooms available for the selected dates.**\n`;
        }
        // Property Description
        if (property?.basicInformation?.descriptions) {
            const desc = property.basicInformation.descriptions.find((d) => d.type.code === 'description');
            if (desc?.text) {
                formattedText += `\n## About the Property\n\n${desc.text}\n`;
            }
        }
        return {
            content: [{
                    type: 'text',
                    text: formattedText
                }],
            structuredContent: {
                propertyId: args.propertyId,
                checkInDate: args.checkInDate,
                checkOutDate: args.checkOutDate,
                property,
                rooms,
                images,
                header,
            },
        };
    }
    catch (error) {
        console.error('❌ Error fetching hotel rates:', error);
        // Provide user-friendly error messages
        let errorMessage = 'Unable to fetch hotel rates. ';
        if (error instanceof Error) {
            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                errorMessage += 'The request was blocked by the server (403 Forbidden). This typically indicates bot detection. The API may require additional authentication headers or cookies that are not available in this environment.';
            }
            else if (error.message.includes('429') || error.message.includes('Rate limited')) {
                errorMessage += 'The service is temporarily rate limited. Please wait a few moments and try again.';
            }
            else if (error.message.includes('status')) {
                errorMessage += 'The hotel booking service is temporarily unavailable. Please try again later.';
            }
            else {
                errorMessage += error.message;
            }
        }
        else {
            errorMessage += 'Please try again later.';
        }
        return {
            content: [{
                    type: 'text',
                    text: errorMessage
                }],
        };
    }
});
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error handling SSE request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Internal server error',
            });
        }
    }
});
const resolveBaseUrl = (req) => {
    const forwardedProto = req.headers['x-forwarded-proto']?.split(',')[0]?.trim();
    const protocol = forwardedProto || req.protocol || 'http';
    const forwardedHost = req.headers['x-forwarded-host'];
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

🚨 GETTING HOTEL DETAILS (4TH TOOL) 🚨

When user asks for "more details", "tell me more about", or "details on [hotel name]":

**Step 1: Extract Property ID from Previous Search**
- Look at the last marriott_search_hotels results
- Each hotel has an "id" field (e.g., "NYCAK", "BOMCY", "NYCMD")
- Match the hotel name the user mentioned to find its ID

**Step 2: Call marriott_hotel_details**
- Use the property ID: marriott_hotel_details({"propertyId": "NYCAK"})
- This displays a detailed page with photos, amenities, location, policies

**Example:**
User: "find hotels in New York"
→ You call: marriott_search_hotels (shows results)
→ Results include: "The Algonquin Hotel" with id="NYCAK"

User: "tell me more about The Algonquin Hotel"
→ You extract: Property ID "NYCAK" from the "SEARCH RESULTS REFERENCE" in previous results
→ You call: marriott_hotel_details({"propertyId": "NYCAK"})
→ Shows full details page with photos carousel

User: "get more details on the second hotel"
→ You identify: Second hotel from previous results reference list
→ You extract: Its EXACT property ID from the reference
→ You call: marriott_hotel_details with that ID

🚨 CRITICAL: NEVER GUESS PROPERTY IDs
- Property IDs MUST come from the "SEARCH RESULTS REFERENCE" in previous marriott_search_hotels response
- Each search response includes: "Hotel Name" - Property ID: XXXXX
- Extract the EXACT property ID from this reference list
- DO NOT try to construct or guess property IDs based on city codes or hotel names
- If property ID is not in previous results, search again first

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

**🚨 CRITICAL: When marriott_search_hotels returns results:**
- An interactive widget will automatically display with all hotel details
- DO NOT create your own text summary of hotels
- DO NOT list hotel names, prices, or details in text
- Simply say something brief like: "I found several hotels. You can browse them in the widget above."
- The widget shows ALL information (hotels, prices, ratings, filters, pagination)
- Let the widget do the work - don't duplicate its content!

**If user asks follow-up questions:**
- Answer based on the data you have
- Suggest using the widget's filters for refinement
- DO NOT re-list all hotels in text format

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
