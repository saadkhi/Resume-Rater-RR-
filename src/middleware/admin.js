import { db } from '../db/index.js';

export const ADMIN_EMAIL = 'saadalioffic@gmail.com';
export const ADMIN_USER_ID = 'usr_admin_saad';
export const ADMIN_DEFAULT_KEY = process.env.ADMIN_OVERRIDE_KEY || 'resume_rater_admin_saad_2026';

// Global state for administrative override toggle
let globalAdminOverride = true; // Enabled by default for the platform owner

export function isGlobalAdminOverrideActive() {
  return globalAdminOverride;
}

export function setGlobalAdminOverride(active) {
  globalAdminOverride = !!active;
  return globalAdminOverride;
}

export function getAdminUser() {
  let user = db.users.find(ADMIN_USER_ID);
  if (!user) {
    user = db.users.create({
      id: ADMIN_USER_ID,
      email: ADMIN_EMAIL,
      name: 'Saad Ali (Platform Admin)',
      role: 'admin',
      isAdmin: true
    });
  }
  return user;
}

export function getAdminSubscription() {
  return {
    id: 'sub_admin_unlimited',
    userId: ADMIN_USER_ID,
    paddleCustomerId: 'ctm_admin_saad',
    paddleSubscriptionId: 'sub_admin_override',
    paddlePriceId: 'pri_admin_unlimited',
    paddleTransactionId: 'txn_admin_unrestricted',
    planTier: 'admin_unlimited',
    status: 'active',
    currentPeriodEnd: '2099-12-31T23:59:59.999Z',
    cancelAtPeriodEnd: false,
    isAdmin: true,
    isPro: true,
    unrestrictedAccess: true,
    createdAt: new Date().toISOString()
  };
}

/**
 * Checks whether the incoming request qualifies for Admin Authentication Override
 */
export function isAdminRequest(req) {
  if (!req) return false;

  // 1. Explicit Admin Override query parameters (e.g. ?admin=true, ?override=true, ?admin_override=true)
  const q = req.query || {};
  if (q.admin === 'true' || q.admin === '1' || q.admin_override === 'true' || q.override === 'true') {
    return true;
  }
  if (q.user_email && q.user_email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  if (q.admin_key && q.admin_key === ADMIN_DEFAULT_KEY) {
    return true;
  }

  // 2. Explicit Admin Headers
  const h = req.headers || {};
  if (h['x-admin-override'] === 'true' || h['x-admin-override'] === '1') {
    return true;
  }
  if (h['x-user-role'] === 'admin') {
    return true;
  }
  if (h['x-user-email'] && h['x-user-email'].toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  if (h['x-admin-key'] && h['x-admin-key'] === ADMIN_DEFAULT_KEY) {
    return true;
  }
  if (h['x-user-id'] === ADMIN_USER_ID) {
    return true;
  }

  // 3. Cookies
  const cookies = req.cookies || {};
  if (cookies.admin_override === 'true' || cookies.admin_auth === 'true' || cookies.user_role === 'admin') {
    return true;
  }
  if (cookies.user_email && cookies.user_email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // 4. Session or authenticated user object
  if (req.user && (req.user.isAdmin || req.user.role === 'admin' || req.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
    return true;
  }

  // 5. Global Admin Override flag (Active for developer / owner environment)
  if (globalAdminOverride) {
    return true;
  }

  return false;
}
