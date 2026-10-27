-- =========================================================================
-- Thunder House ENT - Music Streaming Cloud Vault & Auto-Purge Lifecycle
-- =========================================================================

-- 1. Add cloud storage and expiry columns to thunderhouse_music_scout
ALTER TABLE public.thunderhouse_music_scout 
  ADD COLUMN IF NOT EXISTS clean_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS dirty_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS preview_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days');

-- 2. Create private storage bucket 'music-vault' (capped to 50MB per file)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'music-vault', 
  'music-vault', 
  false, 
  52428800, -- 50MB max per audio file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/x-m4a', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

-- 3. Staff-Gated RLS Policies on storage.objects for music-vault
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff read music-vault'
  ) THEN
    CREATE POLICY "Staff read music-vault"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'music-vault' AND public.is_staff());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff insert music-vault'
  ) THEN
    CREATE POLICY "Staff insert music-vault"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'music-vault' AND public.is_staff());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff delete music-vault'
  ) THEN
    CREATE POLICY "Staff delete music-vault"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'music-vault' AND public.is_staff());
  END IF;
END $$;

-- 4. Function to purge 30-day expired cloud stream records
CREATE OR REPLACE FUNCTION public.purge_expired_music_streams()
RETURNS TABLE (purged_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  UPDATE public.thunderhouse_music_scout
  SET status = 'archived',
      archived_at = now()
  WHERE status = 'downloaded' 
    AND (expires_at IS NOT NULL AND expires_at < now());
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$;
