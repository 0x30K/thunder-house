-- Migration: Equipment Fleet & Wireless Mobile QR Scanner System
-- Created: 2026-10-25

-- 1. Create thunderhouse_equipment table
CREATE TABLE IF NOT EXISTS public.thunderhouse_equipment (
    id TEXT PRIMARY KEY,
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Audio & Decks',
    model_number TEXT,
    serial_number TEXT,
    status TEXT NOT NULL DEFAULT 'Available in Studio',
    condition TEXT NOT NULL DEFAULT 'Excellent',
    current_holder TEXT,
    current_gig_name TEXT,
    checked_out_at TIMESTAMPTZ,
    expected_return_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create thunderhouse_equipment_logs table
CREATE TABLE IF NOT EXISTS public.thunderhouse_equipment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id TEXT NOT NULL REFERENCES public.thunderhouse_equipment(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    staff_email TEXT,
    gig_name TEXT,
    condition_on_action TEXT,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create thunderhouse_scanner_sessions for wireless phone-to-desktop pairing
CREATE TABLE IF NOT EXISTS public.thunderhouse_scanner_sessions (
    session_id TEXT PRIMARY KEY,
    created_by TEXT,
    last_scanned_code TEXT,
    scanned_payload JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.thunderhouse_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thunderhouse_equipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thunderhouse_scanner_sessions ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users & anon (with key)
DROP POLICY IF EXISTS "Public equipment read" ON public.thunderhouse_equipment;
CREATE POLICY "Public equipment read" ON public.thunderhouse_equipment FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public equipment modify" ON public.thunderhouse_equipment;
CREATE POLICY "Public equipment modify" ON public.thunderhouse_equipment FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public equipment logs read" ON public.thunderhouse_equipment_logs;
CREATE POLICY "Public equipment logs read" ON public.thunderhouse_equipment_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public equipment logs modify" ON public.thunderhouse_equipment_logs;
CREATE POLICY "Public equipment logs modify" ON public.thunderhouse_equipment_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public scanner sessions read" ON public.thunderhouse_scanner_sessions;
CREATE POLICY "Public scanner sessions read" ON public.thunderhouse_scanner_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public scanner sessions modify" ON public.thunderhouse_scanner_sessions;
CREATE POLICY "Public scanner sessions modify" ON public.thunderhouse_scanner_sessions FOR ALL USING (true) WITH CHECK (true);

-- Insert starter DJ gear
INSERT INTO public.thunderhouse_equipment (id, barcode, name, category, model_number, serial_number, status, condition, notes)
VALUES 
  ('TH-EQ-001', 'TH-EQ-001', 'Pioneer CDJ-3000 Media Player (Deck A)', 'Decks & Controllers', 'CDJ-3000', 'PND3000-8819A', 'Available in Studio', 'Excellent', 'Main flagship multiplayer in flight case'),
  ('TH-EQ-002', 'TH-EQ-002', 'Pioneer CDJ-3000 Media Player (Deck B)', 'Decks & Controllers', 'CDJ-3000', 'PND3000-8819B', 'Available in Studio', 'Excellent', 'Main flagship multiplayer in flight case'),
  ('TH-EQ-003', 'TH-EQ-003', 'Pioneer DJM-A9 4-Channel Mixer', 'Mixers', 'DJM-A9', 'PNA9-10492', 'Available in Studio', 'Excellent', 'Studio & road mixer with dual USB-C'),
  ('TH-EQ-004', 'TH-EQ-004', 'QSC K12.2 Powered 2000W Speaker (Left)', 'Speakers & Subs', 'K12.2', 'QSCK12-401A', 'Available in Studio', 'Excellent', 'With padded tote bag and power con'),
  ('TH-EQ-005', 'TH-EQ-005', 'QSC K12.2 Powered 2000W Speaker (Right)', 'Speakers & Subs', 'K12.2', 'QSCK12-401B', 'Available in Studio', 'Excellent', 'With padded tote bag and power con'),
  ('TH-EQ-006', 'TH-EQ-006', 'QSC KS118 3600W Active Subwoofer', 'Speakers & Subs', 'KS118', 'QSCKS-9912', 'Available in Studio', 'Excellent', 'Heavy bass cabinet with caster wheels'),
  ('TH-EQ-007', 'TH-EQ-007', 'Shure BLX288/PG58 Dual Wireless Mic System', 'Microphones', 'BLX288/PG58', 'SHR-84291', 'Available in Studio', 'Excellent', 'Dual handheld wireless mics + receiver + fresh AAs'),
  ('TH-EQ-008', 'TH-EQ-008', 'Chauvet DJ GigBAR Move ILS Lighting System', 'Lighting & FX', 'GigBAR Move', 'CHV-55102', 'Available in Studio', 'Good', 'Moving heads, derbys, pars, laser, strobe on tripod')
ON CONFLICT (id) DO NOTHING;
