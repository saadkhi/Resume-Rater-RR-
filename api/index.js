/**
 * Vercel Serverless Function Entry Point
 * Routes all incoming requests through the Express application.
 */
import '../src/polyfills.js';
import app from '../server.js';

export default app;
