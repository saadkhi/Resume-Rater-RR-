import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { db } from '../db/index.js';

const paddleApiKey = process.env.PADDLE_API_KEY;
const paddleWebhookSecretKey = process.env.PADDLE_WEBHOOK_SECRET_KEY;
const paddleEnvString = (process.env.PADDLE_ENVIRONMENT || 'sandbox').toLowerCase();
const paddleEnvironment = paddleEnvString === 'production' ? Environment.production : Environment.sandbox;

// Initialize Paddle Node SDK client if API key is provided
const paddleClient = paddleApiKey ? new Paddle(paddleApiKey, { environment: paddleEnvironment }) : null;

export const PLANS = {
  MONTHLY: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: 5,
    interval: 'month',
    paddlePriceId: process.env.PADDLE_PRICE_ID_PRO_MONTHLY || 'pri_pro_monthly_5usd',
    // Backward-compatible alias
    stripePriceId: process.env.PADDLE_PRICE_ID_PRO_MONTHLY || 'pri_pro_monthly_5usd'
  },
  ANNUAL: {
    id: 'pro_annual',
    name: 'Pro Annual',
    price: 39,
    interval: 'year',
    paddlePriceId: process.env.PADDLE_PRICE_ID_PRO_ANNUAL || 'pri_pro_annual_39usd',
    // Backward-compatible alias
    stripePriceId: process.env.PADDLE_PRICE_ID_PRO_ANNUAL || 'pri_pro_annual_39usd'
  }
};

export const billingService = {
  /**
   * Create Paddle Checkout / Transaction session for subscription
   */
  async createCheckoutSession(userId, planType = 'monthly', hostUrl = 'http://localhost:3000') {
    let user = db.users.find(userId);
    if (!user) {
      user = db.users.create({ id: userId, email: `${userId}@example.com`, name: 'Candidate' });
    }

    const plan = planType === 'annual' ? PLANS.ANNUAL : PLANS.MONTHLY;

    // 1. Live Paddle API Integration via @paddle/paddle-node-sdk
    if (paddleClient && paddleApiKey) {
      try {
        let sub = db.subscriptions.findByUserId(userId);
        let customerId = sub?.paddleCustomerId;

        if (!customerId) {
          try {
            const customer = await paddleClient.customers.create({
              email: user.email,
              name: user.name,
              customData: { userId }
            });
            customerId = customer.id;
          } catch (custErr) {
            console.warn('[Paddle] Customer lookup/creation notice:', custErr.message);
          }
        }

        const transaction = await paddleClient.transactions.create({
          items: [
            {
              priceId: plan.paddlePriceId,
              quantity: 1
            }
          ],
          customerId: customerId || undefined,
          customData: {
            userId,
            planType
          },
          checkout: {
            successUrl: `${hostUrl}/?billing=success&session_id={transaction_id}`
          }
        });

        return {
          transactionId: transaction.id,
          checkoutUrl: transaction.checkout?.url || `${hostUrl}/?billing=success&session_id=${transaction.id}`,
          priceId: plan.paddlePriceId,
          clientToken: process.env.PADDLE_CLIENT_TOKEN || null,
          environment: paddleEnvString,
          isMock: false
        };
      } catch (err) {
        console.error('[Paddle SDK] Transaction creation error:', err.message);
        throw new Error(`Paddle Checkout Error: ${err.message}`);
      }
    }

    // 2. Local Development & Testing Sandbox Flow (Simulated Paddle Transaction)
    const simTxnId = `txn_sim_${Date.now()}`;
    return {
      transactionId: simTxnId,
      checkoutUrl: `${hostUrl}/?billing=success&demo_upgrade=true&session_id=${simTxnId}`,
      priceId: plan.paddlePriceId,
      clientToken: process.env.PADDLE_CLIENT_TOKEN || 'test_client_token',
      environment: 'sandbox',
      isMock: true
    };
  },

  /**
   * Create Customer Portal / Management Session for managing subscription
   */
  async createPortalSession(userId, returnUrl = 'http://localhost:3000') {
    const sub = db.subscriptions.findByUserId(userId);
    if (!sub) {
      throw new Error('No active subscription found.');
    }

    if (paddleClient && sub.paddleSubscriptionId) {
      try {
        const subscription = await paddleClient.subscriptions.get(sub.paddleSubscriptionId);
        const managementUrl = subscription.managementUrls?.updatePaymentMethod || subscription.managementUrls?.cancel;
        if (managementUrl) {
          return { portalUrl: managementUrl };
        }
      } catch (err) {
        console.warn('[Paddle] Subscription portal URL lookup error:', err.message);
      }
    }

    return { portalUrl: `${returnUrl}/#pricing` };
  },

  /**
   * Handle incoming Paddle webhook events (transaction.completed, subscription.activated, etc.)
   */
  async handleWebhook(rawBody, signatureHeader) {
    let event = null;

    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Validate signature using official Paddle SDK if configured
    if (paddleWebhookSecretKey) {
      if (!signatureHeader) {
        throw new Error('Missing Paddle signature header');
      }
      if (paddleClient) {
        try {
          const rawString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
          event = await paddleClient.webhooks.unmarshal(rawString, paddleWebhookSecretKey, signatureHeader);
        } catch (err) {
          console.error('[Paddle Webhook] Signature verification failed:', err.message);
          throw new Error(`Webhook Error: ${err.message}`);
        }
      } else {
        throw new Error('Paddle SDK client not initialized for webhook verification');
      }
    } else if (isProduction) {
      throw new Error('Paddle webhook secret key is not configured in production environment.');
    } else {
      // Direct payload unmarshaling for testing/simulation in development
      try {
        if (Buffer.isBuffer(rawBody)) {
          event = JSON.parse(rawBody.toString('utf8'));
        } else if (typeof rawBody === 'string') {
          event = JSON.parse(rawBody);
        } else {
          event = rawBody;
        }
      } catch (err) {
        throw new Error('Invalid webhook JSON payload');
      }
    }

    if (!event) {
      throw new Error('Webhook event payload is empty');
    }

    const eventType = event.eventType || event.event_type || event.type || 'unknown';
    const eventData = event.data || {};

    console.log(`[Paddle Webhook] Received event: ${eventType}`);

    // Audit log webhook event in database
    if (db.webhookEvents) {
      db.webhookEvents.record({
        id: event.eventId || event.event_id || event.id || `evt_pdl_${Date.now()}`,
        type: eventType,
        payload: eventData
      });
    }

    // Process Paddle Billing Event Types
    switch (eventType) {
      case 'transaction.completed':
      case 'transaction.paid': {
        const customData = eventData.customData || eventData.custom_data || {};
        const userId = customData.userId || customData.user_id || eventData.customerId || 'usr_demo_001';
        const planType = customData.planType || customData.plan_type || 'monthly';
        const customerId = eventData.customerId || eventData.customer_id;
        const subId = eventData.subscriptionId || eventData.subscription_id;

        const expires = new Date();
        if (planType === 'annual') {
          expires.setFullYear(expires.getFullYear() + 1);
        } else {
          expires.setMonth(expires.getMonth() + 1);
        }

        db.subscriptions.upsert({
          userId,
          paddleCustomerId: customerId,
          paddleSubscriptionId: subId,
          paddleTransactionId: eventData.id,
          planTier: planType === 'annual' ? 'pro_annual' : 'pro_monthly',
          status: 'active',
          currentPeriodEnd: expires.toISOString()
        });
        console.log(`[Paddle Webhook] User ${userId} upgraded to Pro via transaction ${eventData.id}`);
        break;
      }

      case 'subscription.activated':
      case 'subscription.created': {
        const subId = eventData.id;
        const customerId = eventData.customerId || eventData.customer_id;
        const customData = eventData.customData || eventData.custom_data || {};
        let existingSub = db.subscriptions.findByPaddleCustomerId(customerId) || db.subscriptions.findByPaddleSubId(subId);

        const currentPeriodEnd = eventData.currentBillingPeriod?.endsAt || 
                                 eventData.current_billing_period?.ends_at || 
                                 new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

        db.subscriptions.upsert({
          userId: existingSub?.userId || customData.userId || 'usr_demo_001',
          paddleCustomerId: customerId,
          paddleSubscriptionId: subId,
          status: 'active',
          currentPeriodEnd
        });
        console.log(`[Paddle Webhook] Subscription ${subId} activated for customer ${customerId}`);
        break;
      }

      case 'subscription.updated': {
        const subId = eventData.id;
        const customerId = eventData.customerId || eventData.customer_id;
        const status = eventData.status || 'active'; // 'active', 'past_due', 'paused'
        const currentPeriodEnd = eventData.currentBillingPeriod?.endsAt || eventData.current_billing_period?.ends_at;
        const isScheduledCancel = eventData.scheduledChange?.action === 'cancel';

        const existingSub = db.subscriptions.findByPaddleSubId(subId) || db.subscriptions.findByPaddleCustomerId(customerId);
        if (existingSub) {
          db.subscriptions.upsert({
            userId: existingSub.userId,
            paddleCustomerId: customerId,
            paddleSubscriptionId: subId,
            status,
            currentPeriodEnd: currentPeriodEnd || existingSub.currentPeriodEnd,
            cancelAtPeriodEnd: isScheduledCancel
          });
          console.log(`[Paddle Webhook] Subscription ${subId} updated to: ${status}`);
        }
        break;
      }

      case 'subscription.canceled':
      case 'subscription.paused': {
        const subId = eventData.id;
        const customerId = eventData.customerId || eventData.customer_id;
        const existingSub = db.subscriptions.findByPaddleSubId(subId) || db.subscriptions.findByPaddleCustomerId(customerId);
        if (existingSub) {
          db.subscriptions.upsert({
            userId: existingSub.userId,
            paddleCustomerId: customerId,
            paddleSubscriptionId: subId,
            status: 'canceled',
            currentPeriodEnd: new Date().toISOString()
          });
          console.log(`[Paddle Webhook] Subscription ${subId} canceled.`);
        }
        break;
      }

      case 'subscription.past_due': {
        const subId = eventData.id;
        const customerId = eventData.customerId || eventData.customer_id;
        const existingSub = db.subscriptions.findByPaddleSubId(subId) || db.subscriptions.findByPaddleCustomerId(customerId);
        if (existingSub) {
          db.subscriptions.upsert({
            userId: existingSub.userId,
            paddleCustomerId: customerId,
            paddleSubscriptionId: subId,
            status: 'past_due'
          });
          console.warn(`[Paddle Webhook] Subscription ${subId} marked past_due.`);
        }
        break;
      }

      default:
        console.log(`[Paddle Webhook] Handled unmapped event type: ${eventType}`);
    }

    return { received: true, eventType };
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

  // Allow sample preview without consuming quota or triggering quota lock
  const isSamplePreviewRequest = req.body?.isSamplePreview && (req.path?.endsWith('/parse-sample') || req.originalUrl?.includes('/parse-sample'));
  if (isSamplePreviewRequest) {
    req.isPro = !!activeSub;
    req.subscription = activeSub;
    req.usage = db.userUsage.getMonthlyUsage(userId, new Date().toISOString().slice(0, 7));
    req.consumeScanQuota = () => {};
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
      message: 'Upgrade to Pro ($5/month) with Paddle for unlimited ATS scans, multi-engine simulations, and Recharts gap analysis.'
    });
  }

  // Quota consumer helper to be called on successful scan
  req.consumeScanQuota = () => {
    db.userUsage.incrementScan(userId, currentMonth);
  };

  next();
}
