-- Resume-Rater-RR SaaS Relational Database Schema
-- Compatible with PostgreSQL / Cloud SQL

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions Table (Paddle Billing Engine)
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  paddle_customer_id VARCHAR(100),
  paddle_subscription_id VARCHAR(100) UNIQUE,
  paddle_price_id VARCHAR(100),
  paddle_transaction_id VARCHAR(100),
  plan_tier VARCHAR(50) DEFAULT 'pro', -- 'pro_monthly', 'pro_annual'
  status VARCHAR(50) NOT NULL DEFAULT 'inactive', -- 'active', 'past_due', 'canceled', 'trialing'
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Monthly Usage Quotas
CREATE TABLE IF NOT EXISTS user_usage (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM' e.g. '2026-10'
  scans_used INT DEFAULT 0,
  max_free_scans INT DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_month UNIQUE(user_id, month_year)
);

-- Parsed Resumes Repository
CREATE TABLE IF NOT EXISTS resumes (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_size_bytes INT,
  page_count INT DEFAULT 1,
  raw_text TEXT NOT NULL,
  cleaned_text TEXT NOT NULL,
  parsed_sections JSONB NOT NULL, -- Education, Experience, Skills, Projects
  detected_category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ATS Match Evaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  resume_id VARCHAR(64) REFERENCES resumes(id) ON DELETE CASCADE,
  target_job_title VARCHAR(255),
  similarity_score NUMERIC(4,2) NOT NULL,
  match_rating VARCHAR(50) NOT NULL,
  dimensions JSONB NOT NULL, -- 5-point Radar competencies
  keyword_gaps JSONB NOT NULL, -- Missing skills & match counts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paddle Webhook Events Audit Log
CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(100) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'processed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Opportunities & Real-time ATS Matching Table
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  company_initial VARCHAR(5) NOT NULL,
  location VARCHAR(255) NOT NULL,
  remote BOOLEAN DEFAULT FALSE,
  remote_text VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  employment_type VARCHAR(50) DEFAULT 'Full-time',
  salary VARCHAR(100),
  experience_level VARCHAR(100),
  posted_at VARCHAR(50),
  source VARCHAR(100) DEFAULT 'JobDataLake API',
  apply_url VARCHAR(500),
  skills JSONB NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for high-throughput queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_usage_user_month ON user_usage(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_user ON evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_jobs_category_remote ON jobs(category, remote);
