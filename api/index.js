/**
 * Vercel Serverless Function Entry Point
 * Routes all incoming requests through the Express application.
 */
import '../src/polyfills.js';
import app from '../server.js';

export default function handler(req, res) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('Unhandled Vercel function error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!DOCTYPE html><html><body><h1>Internal Server Error</h1><pre>${err?.message || err}</pre></body></html>`);
    }
  }
}
