/**
 * Vercel Serverless Function: /api/webhooks/paddle
 * Handles incoming Paddle webhook notifications (transaction.completed, subscription.activated, etc.)
 */
import '../../src/polyfills.js';
import { billingService } from '../../src/services/billing.js';
import app from '../../server.js';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return app(req, res);
  }

  const sig = req.headers?.['paddle-signature'] || req.headers?.['stripe-signature'];

  try {
    let rawBody;
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body;
    } else if (typeof req.body === 'string') {
      rawBody = Buffer.from(req.body);
    } else if (req.body && typeof req.body === 'object') {
      rawBody = Buffer.from(JSON.stringify(req.body));
    } else {
      // Read stream
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      rawBody = Buffer.concat(chunks);
    }

    const result = await billingService.handleWebhook(rawBody, sig);
    if (res.json) {
      return res.json(result);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(result));
  } catch (err) {
    console.error('Paddle webhook error:', err.message);
    if (!res.headersSent) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Webhook verification failed.' }));
    }
  }
}
