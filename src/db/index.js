import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
const bundledDbPath = path.join(__dirname, '..', '..', 'data', 'db.json');
const writableDbPath = isServerless ? path.join(os.tmpdir(), 'resume_rater_db.json') : bundledDbPath;

// In-memory state cache for instant access and resilience against read-only filesystems
let inMemoryDbState = null;

// Initial state template
const initialDbState = {
  users: [
    {
      id: 'usr_demo_001',
      email: 'candidate@example.com',
      name: 'Demo Candidate',
      role: 'user',
      createdAt: new Date().toISOString()
    }
  ],
  subscriptions: [
    {
      id: 'sub_demo_001',
      userId: 'usr_demo_001',
      stripeCustomerId: 'cus_demo_001',
      stripeSubscriptionId: null,
      stripePriceId: null,
      planTier: 'free',
      status: 'inactive',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString()
    }
  ],
  user_usage: [
    {
      id: 'usg_demo_001',
      userId: 'usr_demo_001',
      monthYear: new Date().toISOString().slice(0, 7),
      scansUsed: 0,
      maxFreeScans: 3,
      updatedAt: new Date().toISOString()
    }
  ],
  resumes: [],
  evaluations: [],
  webhook_events: []
};

function ensureDbFile() {
  try {
    const dir = path.dirname(writableDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(writableDbPath)) {
      if (fs.existsSync(bundledDbPath)) {
        const raw = fs.readFileSync(bundledDbPath, 'utf8');
        fs.writeFileSync(writableDbPath, raw, 'utf8');
      } else {
        fs.writeFileSync(writableDbPath, JSON.stringify(initialDbState, null, 2), 'utf8');
      }
    }
  } catch (err) {
    console.warn('Notice: Disk initialization warning (in-memory state active):', err.message);
  }
}

function loadDb() {
  if (inMemoryDbState) {
    return inMemoryDbState;
  }

  ensureDbFile();

  // Try loading from writable path
  if (fs.existsSync(writableDbPath)) {
    try {
      const raw = fs.readFileSync(writableDbPath, 'utf8');
      inMemoryDbState = JSON.parse(raw);
      return inMemoryDbState;
    } catch (err) {
      console.warn('Notice: Could not parse writable DB, falling back:', err.message);
    }
  }

  // Try loading from bundled repo path
  if (fs.existsSync(bundledDbPath)) {
    try {
      const raw = fs.readFileSync(bundledDbPath, 'utf8');
      inMemoryDbState = JSON.parse(raw);
      saveDb(inMemoryDbState);
      return inMemoryDbState;
    } catch (err) {
      console.warn('Notice: Could not parse bundled DB:', err.message);
    }
  }

  // Fallback to initialDbState
  inMemoryDbState = JSON.parse(JSON.stringify(initialDbState));
  saveDb(inMemoryDbState);
  return inMemoryDbState;
}

function saveDb(data) {
  inMemoryDbState = data;
  try {
    const dir = path.dirname(writableDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(writableDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Notice: DB write skipped due to filesystem constraint (in-memory preserved):', err.message);
  }
}

// Database helper API
export const db = {
  // Users
  users: {
    find(id) {
      const state = loadDb();
      return state.users.find(u => u.id === id) || null;
    },
    findByEmail(email) {
      const state = loadDb();
      return state.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },
    create(userData) {
      const state = loadDb();
      const newUser = {
        id: userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: userData.email,
        name: userData.name || 'Candidate',
        role: userData.role || 'user',
        createdAt: new Date().toISOString()
      };
      state.users.push(newUser);
      saveDb(state);
      return newUser;
    }
  },

  // Subscriptions
  subscriptions: {
    findByUserId(userId) {
      const state = loadDb();
      return state.subscriptions.find(s => s.userId === userId) || null;
    },
    findActiveByUserId(userId) {
      const state = loadDb();
      const sub = state.subscriptions.find(s => s.userId === userId);
      if (!sub) return null;
      if (sub.status === 'active') {
        // If currentPeriodEnd is provided, ensure it's still in the future
        if (sub.currentPeriodEnd) {
          const expires = new Date(sub.currentPeriodEnd);
          if (expires > new Date()) return sub;
        } else {
          return sub;
        }
      }
      return null;
    },
    findByStripeCustomerId(customerId) {
      const state = loadDb();
      return state.subscriptions.find(s => s.stripeCustomerId === customerId) || null;
    },
    findByStripeSubId(subId) {
      const state = loadDb();
      return state.subscriptions.find(s => s.stripeSubscriptionId === subId) || null;
    },
    upsert(subData) {
      const state = loadDb();
      const existingIdx = state.subscriptions.findIndex(
        s => s.userId === subData.userId || s.stripeCustomerId === subData.stripeCustomerId
      );

      const record = {
        id: existingIdx >= 0 ? state.subscriptions[existingIdx].id : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: subData.userId,
        stripeCustomerId: subData.stripeCustomerId,
        stripeSubscriptionId: subData.stripeSubscriptionId || null,
        stripePriceId: subData.stripePriceId || null,
        planTier: subData.planTier || 'pro',
        status: subData.status || 'inactive',
        currentPeriodEnd: subData.currentPeriodEnd || null,
        cancelAtPeriodEnd: subData.cancelAtPeriodEnd || false,
        updatedAt: new Date().toISOString(),
        createdAt: existingIdx >= 0 ? state.subscriptions[existingIdx].createdAt : new Date().toISOString()
      };

      if (existingIdx >= 0) {
        state.subscriptions[existingIdx] = record;
      } else {
        state.subscriptions.push(record);
      }
      saveDb(state);
      return record;
    }
  },

  // Usage Quotas
  userUsage: {
    getMonthlyUsage(userId, monthYear = new Date().toISOString().slice(0, 7)) {
      const state = loadDb();
      let usage = state.user_usage.find(u => u.userId === userId && u.monthYear === monthYear);
      if (!usage) {
        usage = {
          id: `usg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId,
          monthYear,
          scansUsed: 0,
          maxFreeScans: 3,
          updatedAt: new Date().toISOString()
        };
        state.user_usage.push(usage);
        saveDb(state);
      }
      return usage;
    },
    incrementScan(userId, monthYear = new Date().toISOString().slice(0, 7)) {
      const state = loadDb();
      let usage = state.user_usage.find(u => u.userId === userId && u.monthYear === monthYear);
      if (!usage) {
        usage = {
          id: `usg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId,
          monthYear,
          scansUsed: 1,
          maxFreeScans: 3,
          updatedAt: new Date().toISOString()
        };
        state.user_usage.push(usage);
      } else {
        usage.scansUsed = (usage.scansUsed || 0) + 1;
        usage.updatedAt = new Date().toISOString();
      }
      saveDb(state);
      return usage;
    },
    setScansUsed(userId, count, monthYear = new Date().toISOString().slice(0, 7)) {
      const state = loadDb();
      let usage = state.user_usage.find(u => u.userId === userId && u.monthYear === monthYear);
      if (!usage) {
        usage = {
          id: `usg_${Date.now()}`,
          userId,
          monthYear,
          scansUsed: count,
          maxFreeScans: 3,
          updatedAt: new Date().toISOString()
        };
        state.user_usage.push(usage);
      } else {
        usage.scansUsed = count;
        usage.updatedAt = new Date().toISOString();
      }
      saveDb(state);
      return usage;
    }
  },

  // Resumes
  resumes: {
    create(resumeData) {
      const state = loadDb();
      const record = {
        id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...resumeData,
        createdAt: new Date().toISOString()
      };
      state.resumes.push(record);
      saveDb(state);
      return record;
    },
    findByUserId(userId) {
      const state = loadDb();
      return state.resumes.filter(r => r.userId === userId);
    }
  },

  // Evaluations
  evaluations: {
    create(evalData) {
      const state = loadDb();
      const record = {
        id: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...evalData,
        createdAt: new Date().toISOString()
      };
      state.evaluations.push(record);
      saveDb(state);
      return record;
    },
    findByUserId(userId) {
      const state = loadDb();
      return state.evaluations.filter(e => e.userId === userId);
    }
  },

  // Webhook Events
  webhookEvents: {
    record(eventData) {
      const state = loadDb();
      if (!state.webhook_events) state.webhook_events = [];
      const record = {
        id: eventData.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventType: eventData.type || eventData.eventType || 'unknown',
        payload: eventData.data || eventData.payload || {},
        status: 'processed',
        receivedAt: new Date().toISOString()
      };
      state.webhook_events.push(record);
      saveDb(state);
      return record;
    },
    list() {
      const state = loadDb();
      return state.webhook_events || [];
    }
  }
};
