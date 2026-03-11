-- Migration to fix missing columns in repos table
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns to repos table if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repos' AND column_name='updated_at') THEN
        ALTER TABLE repos ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repos' AND column_name='context_summary') THEN
        ALTER TABLE repos ADD COLUMN context_summary JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repos' AND column_name='last_context_built_at') THEN
        ALTER TABLE repos ADD COLUMN last_context_built_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Update the trigger function to be more robust (already updated in schema.sql but good to run here too)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
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

-- 3. Ensure other tables also have updated_at (just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='issues' AND column_name='updated_at') THEN
        ALTER TABLE issues ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pull_requests' AND column_name='updated_at') THEN
        ALTER TABLE pull_requests ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agent_tasks' AND column_name='updated_at') THEN
        ALTER TABLE agent_tasks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;
