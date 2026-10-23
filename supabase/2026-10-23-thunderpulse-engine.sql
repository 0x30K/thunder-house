-- Migration: ThunderPulse Intelligence Feed & Morning Show Engine
-- Creates tables for real-time news ingestion and daily show compilation.

CREATE TABLE IF NOT EXISTS public.thunderpulse_feed (
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

CREATE INDEX IF NOT EXISTS idx_thunderpulse_feed_category ON public.thunderpulse_feed(category);
CREATE INDEX IF NOT EXISTS idx_thunderpulse_feed_published ON public.thunderpulse_feed(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_thunderpulse_feed_virality ON public.thunderpulse_feed(virality_score DESC);

CREATE TABLE IF NOT EXISTS public.thunderpulse_shows (
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

ALTER TABLE public.thunderpulse_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thunderpulse_shows ENABLE ROW LEVEL SECURITY;
