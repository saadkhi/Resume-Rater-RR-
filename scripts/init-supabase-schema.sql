-- Resume Rater (RR) - Supabase PostgreSQL Schema
-- Host: db.medvnbynodmsjaqvtjzl.supabase.co
-- Database: postgres

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    paddle_customer_id TEXT,
    paddle_subscription_id TEXT,
    paddle_price_id TEXT,
    paddle_transaction_id TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_tier TEXT DEFAULT 'free',
    status TEXT DEFAULT 'inactive',
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE TABLE IF NOT EXISTS user_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,
    scans_used INTEGER DEFAULT 0,
    max_free_scans INTEGER DEFAULT 3,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month_year)
);

CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    title TEXT,
    filename TEXT,
    file_size_bytes INTEGER,
    page_count INTEGER DEFAULT 1,
    raw_text TEXT,
    cleaned_text TEXT,
    parsed_sections JSONB,
    detected_category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    resume_id TEXT REFERENCES resumes(id) ON DELETE CASCADE,
    target_job_title TEXT,
    similarity_score NUMERIC(5, 2),
    match_rating TEXT,
    dimensions JSONB,
    keyword_gaps JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_resume_id ON evaluations(resume_id);

CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    event_id TEXT UNIQUE,
    event_type TEXT,
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    category TEXT NOT NULL,
    remote BOOLEAN DEFAULT FALSE,
    description TEXT,
    required_skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);

-- Insert Platform Admin user by default
INSERT INTO users (id, email, name, role, is_admin)
VALUES ('usr_admin_saad', 'saadalioffic@gmail.com', 'Saad Ali (Admin)', 'admin', TRUE)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    is_admin = EXCLUDED.is_admin;

-- Insert Platform Admin subscription
INSERT INTO subscriptions (id, user_id, paddle_customer_id, paddle_subscription_id, plan_tier, status, current_period_end)
VALUES ('sub_admin_saad', 'usr_admin_saad', 'ctm_admin_saad', 'sub_admin_override', 'admin_unlimited', 'active', '2099-12-31 23:59:59+00')
ON CONFLICT (id) DO UPDATE SET
    status = 'active',
    plan_tier = 'admin_unlimited';
