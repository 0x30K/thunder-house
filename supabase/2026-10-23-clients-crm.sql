-- Migration: Client CRM & Marketing Database for Thunder House ENT
-- Description: Creates thunderhouse_clients table with RLS and automatic timestamps.

CREATE TABLE IF NOT EXISTS public.thunderhouse_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    company TEXT,
    address TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    total_events INT DEFAULT 0,
    lifetime_spend NUMERIC DEFAULT 0,
    email_list_opt_in BOOLEAN DEFAULT true,
    source TEXT DEFAULT 'direct',
    status TEXT DEFAULT 'active', -- active, lead, past, vip, archived
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_thunderhouse_clients_email ON public.thunderhouse_clients(email);
CREATE INDEX IF NOT EXISTS idx_thunderhouse_clients_phone ON public.thunderhouse_clients(phone);
CREATE INDEX IF NOT EXISTS idx_thunderhouse_clients_created_at ON public.thunderhouse_clients(created_at DESC);

-- Enable RLS
ALTER TABLE public.thunderhouse_clients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated staff / superusers full CRUD access
DROP POLICY IF EXISTS "Staff can manage clients" ON public.thunderhouse_clients;
CREATE POLICY "Staff can manage clients" ON public.thunderhouse_clients
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow public intake / inquiries to insert or register clients
DROP POLICY IF EXISTS "Public intake can insert client" ON public.thunderhouse_clients;
CREATE POLICY "Public intake can insert client" ON public.thunderhouse_clients
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Allow anon to select their own or query by email if needed
DROP POLICY IF EXISTS "Public can view clients" ON public.thunderhouse_clients;
CREATE POLICY "Public can view clients" ON public.thunderhouse_clients
    FOR SELECT
    TO anon
    USING (true);

-- Seed existing inquiries into thunderhouse_clients if not already present
INSERT INTO public.thunderhouse_clients (full_name, email, phone, source, status, created_at)
SELECT DISTINCT ON (LOWER(email))
    full_name,
    LOWER(email),
    phone,
    'inquiry',
    'lead',
    created_at
FROM public.thunderhouse_inquiries
WHERE email IS NOT NULL AND email != ''
ON CONFLICT (email) DO NOTHING;
