/**
 * Vercel Serverless Function: /api/sample-resumes
 */
import '../src/polyfills.js';
import app from '../server.js';

export default function handler(req, res) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('API /api/sample-resumes error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'An unexpected error occurred.' }));
    }
  }
}
