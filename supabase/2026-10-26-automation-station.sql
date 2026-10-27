-- Migration: Automation Station - Central Background Operations & Schedulers
-- Provides a centralized registry and log store for all automated processes in Thunder House ENT.

CREATE TABLE IF NOT EXISTS public.thunderhouse_automations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    schedule_type TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'interval', 'weekly', 'event_driven'
    schedule_time TEXT DEFAULT '06:00',
    schedule_interval_mins INT DEFAULT 60,
    days_of_week INT[] DEFAULT '{0,1,2,3,4,5,6}',
    runner_type TEXT NOT NULL DEFAULT 'python_daemon', -- 'python_daemon', 'api_endpoint', 'database_function', 'client_api', 'event_hook'
    endpoint_url TEXT,
    target_folder TEXT,
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT DEFAULT 'idle', -- 'idle', 'running', 'success', 'warning', 'error'
    last_run_summary TEXT,
    last_duration_ms INT DEFAULT 0,
    next_run_at TIMESTAMPTZ,
    total_runs INT DEFAULT 0,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.thunderhouse_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id TEXT REFERENCES public.thunderhouse_automations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'success', -- 'running', 'success', 'warning', 'error'
    summary TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    duration_ms INT DEFAULT 0,
    triggered_by TEXT DEFAULT 'scheduler', -- 'scheduler', 'manual_admin', 'system_event'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_th_auto_logs_id ON public.thunderhouse_automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_th_auto_logs_created ON public.thunderhouse_automation_logs(created_at DESC);

ALTER TABLE public.thunderhouse_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thunderhouse_automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access on automations" ON public.thunderhouse_automations;
CREATE POLICY "Public full access on automations" ON public.thunderhouse_automations FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access on automation logs" ON public.thunderhouse_automation_logs;
CREATE POLICY "Public full access on automation logs" ON public.thunderhouse_automation_logs FOR ALL TO public USING (true) WITH CHECK (true);
