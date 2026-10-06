/**
 * Vercel Serverless Function: /api/csv-records
 */
import '../src/polyfills.js';
import app from '../server.js';

export default function handler(req, res) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('API /api/csv-records error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }
}
