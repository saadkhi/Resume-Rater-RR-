/**
 * Vercel Serverless Function: /api/create-checkout-session
 * Paddle Billing Checkout Session & Transaction Creation
 */
import '../src/polyfills.js';
import { billingService } from '../src/services/billing.js';
import app from '../server.js';

export default async function handler(req, res) {
  const method = req.method || 'POST';

  if (method === 'POST') {
    try {
      const userId = req.headers?.['x-user-id'] || req.body?.userId || 'usr_demo_001';
      const plan = req.body?.plan || 'monthly'; // 'monthly' | 'annual'
      const protocol = req.headers?.['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers?.host || req.get?.('host') || 'localhost:3000';
      const hostUrl = `${protocol}://${host}`;

      const session = await billingService.createCheckoutSession(userId, plan, hostUrl);

      if (res.json) {
        return res.json({ success: true, ...session });
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true, ...session }));
    } catch (err) {
      console.error('API /api/create-checkout-session error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          success: false, 
          error: err.message || 'Failed to initialize Paddle checkout transaction.' 
        }));
      }
      return;
    }
  }

  return app(req, res);
}
