-- Seed data for ContriBot testing
-- Creates a test user and some sample data

-- 1. Create a test user
INSERT INTO users (id, firebase_uid, email, github_username, avatar_url)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'test_firebase_uid_123',
    'test@example.com',
    'testuser',
    'https://github.com/testuser.png'
) ON CONFLICT (firebase_uid) DO NOTHING;

-- 2. Create user settings for the test user
INSERT INTO user_settings (user_id)
VALUES ('11111111-1111-1111-1111-111111111111')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Create a sample repository
INSERT INTO repos (id, user_id, github_full_name, github_repo_url, contribot_active, current_version)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'testuser/sample-repo',
    'https://github.com/testuser/sample-repo',
    TRUE,
    'v1.0.0'
) ON CONFLICT (user_id, github_full_name) DO NOTHING;

-- 4. Create a sample issue
INSERT INTO issues (id, repo_id, github_issue_number, issue_type, title, body, status, ai_analysis)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    1,
    'bug',
    'Fix login button alignment',
    'The login button is slightly off-center on mobile devices.',
    'open',
    '{"complexity": "low", "estimated_time": "30m", "suggested_fix": "Add mx-auto to the button classes."}'
) ON CONFLICT DO NOTHING;

-- 5. Create a sample activity log
INSERT INTO activity_log (repo_id, event_type, message, severity)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'repo_activated',
    'ContriBot activated for repo',
    'info'
) ON CONFLICT DO NOTHING;
