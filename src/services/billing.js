import Stripe from 'stripe';
import { db } from '../db/index.js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripeClient = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export const PLANS = {
  MONTHLY: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: 5,
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || 'price_pro_monthly_5usd'
  },
  ANNUAL: {
    id: 'pro_annual',
    name: 'Pro Annual',
    price: 39,
    interval: 'year',
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO_ANNUAL || 'price_pro_annual_39usd'
  }
};

export const billingService = {
  /**
   * Create Stripe Checkout session for subscription
   */
  async createCheckoutSession(userId, planType = 'monthly', hostUrl = 'http://localhost:3000') {
    const user = db.users.find(userId);
    if (!user) throw new Error('User not found');

    const plan = planType === 'annual' ? PLANS.ANNUAL : PLANS.MONTHLY;

    // In production with Stripe credentials
    if (stripeClient && process.env.STRIPE_SECRET_KEY) {
      let sub = db.subscriptions.findByUserId(userId);
      let customerId = sub?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripeClient.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId }
        });
        customerId = customer.id;
      }

      const session = await stripeClient.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: `${hostUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${hostUrl}/#pricing?billing=canceled`,
        client_reference_id: userId,
        metadata: {
          userId,
          planType
        }
      });

      return { checkoutUrl: session.url, sessionId: session.id, isMock: false };
    }

    // Demo / Dev Mode Fallback:
    // Simulates instant upgrade for sandbox evaluation when Stripe keys aren't provided
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    db.subscriptions.upsert({
      userId,
      stripeCustomerId: `cus_demo_${userId}`,
      stripeSubscriptionId: `sub_demo_${Date.now()}`,
      stripePriceId: plan.stripePriceId,
      planTier: plan.id,
      status: 'active',
      currentPeriodEnd: oneMonthFromNow.toISOString()
    });

    return {
      checkoutUrl: `/?billing=success&demo_upgrade=true&plan=${plan.id}`,
      sessionId: `mock_sess_${Date.now()}`,
      isMock: true,
      message: 'Demo mode upgrade applied: Pro tier activated ($5/mo simulated).'
    };
  },

  /**
   * Create Customer Portal session for managing/canceling subscription
   */
  async createPortalSession(userId, returnUrl = 'http://localhost:3000') {
    const sub = db.subscriptions.findByUserId(userId);
    if (!sub?.stripeCustomerId) {
      throw new Error('No active Stripe customer found.');
    }

    if (stripeClient && process.env.STRIPE_SECRET_KEY) {
      const portal = await stripeClient.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: returnUrl
      });
      return { portalUrl: portal.url };
    }

    // Demo portal fallback
    return {
      portalUrl: `${returnUrl}/#pricing?portal=demo`,
      isMock: true
    };
  },

  /**
   * Handle incoming Stripe webhook events
   */
  async handleWebhook(rawBody, signatureHeader) {
    let event;

    if (stripeClient && stripeWebhookSecret) {
      try {
        event = stripeClient.webhooks.constructEvent(rawBody, signatureHeader, stripeWebhookSecret);
      } catch (err) {
        console.error('⚠️ Stripe Webhook signature verification failed:', err.message);
        throw new Error(`Webhook Error: ${err.message}`);
      }
    } else {
      // In dev/test when webhook secret is omitted, parse payload directly
      try {
        if (Buffer.isBuffer(rawBody)) {
          event = JSON.parse(rawBody.toString('utf8'));
        } else if (typeof rawBody === 'string') {
          event = JSON.parse(rawBody);
        } else {
          event = rawBody;
        }
      } catch (err) {
        throw new Error('Invalid JSON webhook payload: ' + err.message);
      }
    }

    if (!event || !event.type) {
      throw new Error('Webhook event type missing from payload');
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    // Audit log webhook event in database
    if (db.webhookEvents) {
      db.webhookEvents.record({
        id: event.id || `evt_${Date.now()}`,
        type: event.type,
        data: event.data
      });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const customerId = session.customer;
        const subId = session.subscription;

        if (userId) {
          const expires = new Date();
          expires.setMonth(expires.getMonth() + 1);

          db.subscriptions.upsert({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subId,
            planTier: session.metadata?.planType === 'annual' ? 'pro_annual' : 'pro_monthly',
            status: 'active',
            currentPeriodEnd: expires.toISOString()
          });
          console.log(`[Stripe Webhook] User ${userId} upgraded to Pro.`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status; // active, past_due, canceled
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        const existingSub = db.subscriptions.findByStripeCustomerId(customerId);
        if (existingSub) {
          db.subscriptions.upsert({
            userId: existingSub.userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            status,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false
          });
          console.log(`[Stripe Webhook] Subscription for customer ${customerId} updated to: ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const existingSub = db.subscriptions.findByStripeCustomerId(customerId);
        if (existingSub) {
          db.subscriptions.upsert({
            userId: existingSub.userId,
            stripeCustomerId: customerId,
            status: 'canceled',
            currentPeriodEnd: new Date().toISOString()
          });
          console.log(`[Stripe Webhook] Subscription for customer ${customerId} canceled.`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const existingSub = db.subscriptions.findByStripeCustomerId(customerId);
        if (existingSub) {
          db.subscriptions.upsert({
            userId: existingSub.userId,
            stripeCustomerId: customerId,
            status: 'past_due'
          });
          console.warn(`[Stripe Webhook] Invoice payment failed for customer ${customerId}.`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }
};

/**
 * Subscription & Quota Enforcement Middleware
 */
export function checkSubscriptionAndQuota(req, res, next) {
  // Resolve current user (from header, cookie, or default demo candidate)
  const userId = req.headers['x-user-id'] || req.cookies?.user_id || 'usr_demo_001';
  let user = db.users.find(userId);
  if (!user) {
    user = db.users.create({ id: userId, email: 'candidate@example.com', name: 'Demo Candidate' });
  }
  req.user = user;

  // 1. Check for Active Subscription
  const activeSub = db.subscriptions.findActiveByUserId(userId);
  if (activeSub) {
    req.isPro = true;
    req.subscription = activeSub;
    req.consumeScanQuota = () => {}; // Unlimited for Pro
    return next();
  }

  // 2. Free Tier: Check monthly quota
  const currentMonth = new Date().toISOString().slice(0, 7);
  const usage = db.userUsage.getMonthlyUsage(userId, currentMonth);

  req.isPro = false;
  req.subscription = null;
  req.usage = usage;

  // Enforce Free Limit (3 scans/month)
  if (usage.scansUsed >= usage.maxFreeScans) {
    return res.status(403).json({
      success: false,
      error: `Monthly free scan limit reached (${usage.scansUsed}/${usage.maxFreeScans}).`,
      requiresUpgrade: true,
      upgradeUrl: '/#pricing',
      redirectUrl: '/#pricing',
      checkoutApi: '/api/create-checkout-session',
      scansUsed: usage.scansUsed,
      maxFreeScans: usage.maxFreeScans,
      message: 'Upgrade to Pro ($5/month) for unlimited ATS scans, multi-engine simulations, and Recharts gap analysis.'
    });
  }

  // Quota consumer helper to be called on successful scan
  req.consumeScanQuota = () => {
    db.userUsage.incrementScan(userId, currentMonth);
  };

  next();
}
