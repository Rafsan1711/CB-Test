-- ContriBot Database Schema
-- This file is idempotent and safe to run multiple times.
-- It creates all necessary tables, indexes, triggers, and disables RLS.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to update updated_at timestamp
-- Robust version: checks if column exists before updating
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if updated_at column exists in the table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME 
        AND column_name = 'updated_at'
    ) THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 1. users
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    github_username TEXT,
    avatar_url TEXT,
    providers TEXT[] DEFAULT '{}',
    github_token_scopes TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE users IS 'Stores user accounts and their authentication details.';

-- Disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 2. user_settings
-- ==========================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    consensus_threshold INTEGER DEFAULT 3,
    max_file_size_kb INTEGER DEFAULT 100,
    max_context_files INTEGER DEFAULT 60,
    temperature FLOAT DEFAULT 0.3,
    enable_external_api_calls BOOLEAN DEFAULT TRUE,
    auto_install_templates BOOLEAN DEFAULT TRUE,
    default_version_start TEXT DEFAULT 'v1.0.0',
    release_trigger TEXT DEFAULT 'manual',
    notification_email BOOLEAN DEFAULT TRUE,
    notification_browser BOOLEAN DEFAULT FALSE,
    webhook_log_retention_days INTEGER DEFAULT 30,
    activity_log_retention_days INTEGER DEFAULT 90,
    default_branch TEXT DEFAULT 'main',
    auto_close_stale_prs_days INTEGER DEFAULT 0,
    require_ci_before_verification BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE user_settings IS 'Stores user-specific settings and preferences.';

ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 3. repos
-- ==========================================
CREATE TABLE IF NOT EXISTS repos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    github_full_name TEXT NOT NULL,
    github_repo_url TEXT,
    contribot_active BOOLEAN DEFAULT FALSE,
    current_version TEXT DEFAULT 'v0.0.0',
    webhook_secret TEXT,
    webhook_hook_id TEXT,
    settings JSONB DEFAULT '{}',
    last_context_built_at TIMESTAMPTZ,
    context_summary JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, github_full_name)
);
COMMENT ON TABLE repos IS 'Stores GitHub repositories managed by ContriBot.';

ALTER TABLE repos DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_repos_user_id ON repos(user_id);

DROP TRIGGER IF EXISTS update_repos_updated_at ON repos;
CREATE TRIGGER update_repos_updated_at
    BEFORE UPDATE ON repos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 4. issues
-- ==========================================
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
    github_issue_number INTEGER,
    issue_type TEXT,
    title TEXT NOT NULL,
    body TEXT,
    status TEXT DEFAULT 'open',
    user_response TEXT,
    ai_analysis JSONB DEFAULT '{}',
    labels TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE issues IS 'Stores GitHub issues and ContriBot analysis.';

ALTER TABLE issues DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_issues_repo_id ON issues(repo_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

DROP TRIGGER IF EXISTS update_issues_updated_at ON issues;
CREATE TRIGGER update_issues_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 5. pull_requests
-- ==========================================
CREATE TABLE IF NOT EXISTS pull_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
    issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
    github_pr_number INTEGER,
    title TEXT NOT NULL,
    branch_name TEXT,
    status TEXT DEFAULT 'open',
    verification_status TEXT DEFAULT 'pending',
    verification_results JSONB DEFAULT '{}',
    consensus_score INTEGER DEFAULT 0,
    weighted_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE pull_requests IS 'Stores pull requests created or managed by ContriBot.';

ALTER TABLE pull_requests DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_id ON pull_requests(repo_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_issue_id ON pull_requests(issue_id);

DROP TRIGGER IF EXISTS update_pull_requests_updated_at ON pull_requests;
CREATE TRIGGER update_pull_requests_updated_at
    BEFORE UPDATE ON pull_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. agent_tasks
-- ==========================================
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    model_used TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE agent_tasks IS 'Stores background tasks executed by ContriBot agents.';

ALTER TABLE agent_tasks DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agent_tasks_repo_id ON agent_tasks(repo_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);

DROP TRIGGER IF EXISTS update_agent_tasks_updated_at ON agent_tasks;
CREATE TRIGGER update_agent_tasks_updated_at
    BEFORE UPDATE ON agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 7. releases
-- ==========================================
CREATE TABLE IF NOT EXISTS releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    bump_type TEXT,
    release_notes TEXT,
    github_release_url TEXT,
    tag_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE releases IS 'Stores releases managed by ContriBot.';

ALTER TABLE releases DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_releases_repo_id ON releases(repo_id);

DROP TRIGGER IF EXISTS update_releases_updated_at ON releases;
CREATE TRIGGER update_releases_updated_at
    BEFORE UPDATE ON releases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 8. activity_log
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE activity_log IS 'Stores activity events for repositories.';

ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_log_repo_id ON activity_log(repo_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- ==========================================
-- 9. error_logs
-- ==========================================
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
    task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    severity TEXT DEFAULT 'error',
    message TEXT NOT NULL,
    traceback TEXT,
    context JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE error_logs IS 'Stores detailed error logs for debugging.';

ALTER TABLE error_logs DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_error_logs_repo_id ON error_logs(repo_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
