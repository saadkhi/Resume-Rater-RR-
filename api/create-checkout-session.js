/**
 * Vercel Serverless Function: /api/create-checkout-session
 * Paddle Billing Checkout Session & Transaction Creation
 */
import '../src/polyfills.js';
import { billingService } from '../src/services/billing.js';
import { isAdminRequest } from '../src/middleware/admin.js';
import app from '../server.js';

export default async function handler(req, res) {
  // Always guarantee application/json header for all API responses
  if (res.setHeader && !res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
  }

  const method = req.method || 'POST';

  if (method === 'POST' || method === 'GET') {
    try {
      const admin = isAdminRequest(req);
      const protocol = req.headers?.['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers?.host || req.get?.('host') || 'localhost:3000';
      const hostUrl = `${protocol}://${host}`;

      if (admin) {
        const adminResponse = {
          success: true,
          isAdmin: true,
          isPro: true,
          unrestrictedAccess: true,
          message: 'Admin authentication override active. You have full, unrestricted access to all platform features.',
          plan: req.body?.plan || 'admin_unlimited',
          checkoutUrl: `${hostUrl}/?admin=true&unrestricted=active`,
          transactionId: `txn_admin_${Date.now()}`
        };
        if (res.json) return res.json(adminResponse);
        res.statusCode = 200;
        return res.end(JSON.stringify(adminResponse));
      }

      if (method === 'GET') {
        const getInfo = {
          success: true,
          message: 'Use POST /api/create-checkout-session to initiate a checkout session.',
          availablePlans: ['monthly', 'annual']
        };
        if (res.json) return res.json(getInfo);
        res.statusCode = 200;
        return res.end(JSON.stringify(getInfo));
      }

      const userId = req.headers?.['x-user-id'] || req.body?.userId || 'usr_demo_001';
      const plan = req.body?.plan || 'monthly'; // 'monthly' | 'annual'

      const session = await billingService.createCheckoutSession(userId, plan, hostUrl);

      if (res.json) {
        return res.json({ success: true, ...session });
      }
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, ...session }));
    } catch (err) {
      console.error('API /api/create-checkout-session error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        if (res.setHeader) res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: err.message || 'Failed to initialize Paddle checkout transaction.' 
        }));
      }
      return;
    }
  }

  return app(req, res);
}
