-- Migration: Thunder House System Error Logging & Health Monitoring
-- Description: Creates a lightweight, deduplicated, self-pruning error log table.

CREATE TABLE IF NOT EXISTS public.thunderhouse_system_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,                  -- 'thunder_wire', 'admin_portal', 'intake', 'checkout', 'obs_overlay', 'keys', 'gigs'
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context JSONB DEFAULT '{}'::jsonb,     -- URL, browser, user ID, state
    severity TEXT DEFAULT 'error',          -- 'critical', 'error', 'warn'
    count INT DEFAULT 1,                   -- Auto-increments when the same error occurs again
    last_occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index to prevent table flooding; identical errors increment the count instead of adding rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_thunderhouse_system_errors_dedup 
ON public.thunderhouse_system_errors (source, error_message);

CREATE INDEX IF NOT EXISTS idx_thunderhouse_system_errors_time 
ON public.thunderhouse_system_errors (last_occurred_at DESC);

-- Atomic logger function: inserts new or increments existing count and updates timestamp
CREATE OR REPLACE FUNCTION public.log_thunder_error(
    p_source TEXT,
    p_message TEXT,
    p_stack TEXT DEFAULT NULL,
    p_context JSONB DEFAULT '{}'::jsonb,
    p_severity TEXT DEFAULT 'error'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
    v_total_rows INT;
BEGIN
    INSERT INTO public.thunderhouse_system_errors (
        source, error_message, error_stack, context, severity, count, last_occurred_at
    )
    VALUES (
        p_source, p_message, p_stack, p_context, p_severity, 1, NOW()
    )
    ON CONFLICT (source, error_message)
    DO UPDATE SET
        count = public.thunderhouse_system_errors.count + 1,
        last_occurred_at = NOW(),
        error_stack = COALESCE(EXCLUDED.error_stack, public.thunderhouse_system_errors.error_stack),
        context = EXCLUDED.context
    RETURNING id INTO v_id;

    -- Self-pruning limit: keep at most 200 distinct error signatures
    SELECT COUNT(*) INTO v_total_rows FROM public.thunderhouse_system_errors;
    IF v_total_rows > 200 THEN
        DELETE FROM public.thunderhouse_system_errors
        WHERE id IN (
            SELECT id FROM public.thunderhouse_system_errors
            ORDER BY last_occurred_at ASC
            LIMIT (v_total_rows - 200)
        );
    END IF;

    RETURN v_id;
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.thunderhouse_system_errors ENABLE ROW LEVEL SECURITY;

-- Public can report errors through the atomic function or direct insert
DROP POLICY IF EXISTS "Public can report errors" ON public.thunderhouse_system_errors;
CREATE POLICY "Public can report errors" ON public.thunderhouse_system_errors
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update error count" ON public.thunderhouse_system_errors;
CREATE POLICY "Public can update error count" ON public.thunderhouse_system_errors
    FOR UPDATE USING (true);

-- Authenticated staff can view and manage error logs
DROP POLICY IF EXISTS "Staff can view errors" ON public.thunderhouse_system_errors;
CREATE POLICY "Staff can view errors" ON public.thunderhouse_system_errors
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can delete errors" ON public.thunderhouse_system_errors;
CREATE POLICY "Staff can delete errors" ON public.thunderhouse_system_errors
    FOR DELETE TO authenticated USING (true);
