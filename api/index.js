// Vercel serverless function wrapper for hotel-server
// This adapts the Express app to work in Vercel's serverless environment

// Import the compiled Express app
// Note: The hotel-server.ts exports the app as default for Vercel
import app from '../dist/hotel-server.js';

// Vercel expects a default export function
// The Express app will handle all routing internally
export default app;
