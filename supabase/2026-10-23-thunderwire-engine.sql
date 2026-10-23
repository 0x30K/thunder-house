-- Migration: Thunder Wire Intelligence Feed & Morning Show Engine
-- Creates/migrates tables for real-time news ingestion and daily show compilation.

DO $$ 
BEGIN
    -- Rename from thunderpulse_feed if it exists and thunderwire_feed does not
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thunderpulse_feed') 
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thunderwire_feed') THEN
        ALTER TABLE public.thunderpulse_feed RENAME TO thunderwire_feed;
    END IF;

    -- Rename from thunderpulse_shows if it exists and thunderwire_shows does not
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thunderpulse_shows') 
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thunderwire_shows') THEN
        ALTER TABLE public.thunderpulse_shows RENAME TO thunderwire_shows;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.thunderwire_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    source_name TEXT NOT NULL,
    source_url TEXT UNIQUE NOT NULL,
    image_url TEXT,
    category TEXT NOT NULL DEFAULT 'lead', -- 'lead', 'shade', 'drops', 'wild', 'realtalk'
    virality_score INT DEFAULT 50,
    verification_status TEXT DEFAULT 'confirmed', -- 'confirmed', 'developing', 'rumor'
    talking_points JSONB DEFAULT '[]'::jsonb,
    why_it_matters TEXT,
    host_question TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    selected_for_show BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thunderwire_feed_category ON public.thunderwire_feed(category);
CREATE INDEX IF NOT EXISTS idx_thunderwire_feed_published ON public.thunderwire_feed(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_thunderwire_feed_virality ON public.thunderwire_feed(virality_score DESC);

CREATE TABLE IF NOT EXISTS public.thunderwire_shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_date DATE NOT NULL UNIQUE,
    episode_title TEXT DEFAULT '#WAKEITUP Morning Broadcast',
    status TEXT DEFAULT 'draft',
    selected_stories JSONB DEFAULT '[]'::jsonb,
    cold_open_script TEXT,
    outro_script TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.thunderwire_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thunderwire_shows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated staff can manage thunderwire_feed" ON public.thunderwire_feed;
CREATE POLICY "Authenticated staff can manage thunderwire_feed" ON public.thunderwire_feed
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read thunderwire_feed" ON public.thunderwire_feed;
CREATE POLICY "Public can read thunderwire_feed" ON public.thunderwire_feed
    FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Authenticated staff can manage thunderwire_shows" ON public.thunderwire_shows;
CREATE POLICY "Authenticated staff can manage thunderwire_shows" ON public.thunderwire_shows
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
