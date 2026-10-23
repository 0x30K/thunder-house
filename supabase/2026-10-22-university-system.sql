-- =====================================================================
-- THUNDER HOUSE ENT: University Student Profiles & Artist Overrides (2026-10-22)
--
-- 1. university_student_profiles:
--    Stores student progress, quiz scores, completed genre masterclasses,
--    bookmarked artists, and personal study notes.
--    Ties directly to auth.users.
--
-- 2. university_artist_overrides:
--    Allows superusers (staff) to dynamically edit artist profiles,
--    add/update YouTube music videos, and change curator notes with
--    real-time persistence without redeploying code.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.university_student_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  degree_progress numeric DEFAULT 0,
  completed_credits integer DEFAULT 0,
  completed_artists jsonb DEFAULT '[]'::jsonb,
  artist_tasks jsonb DEFAULT '{}'::jsonb,
  quiz_scores jsonb DEFAULT '{}'::jsonb,
  bookmarked_artists jsonb DEFAULT '[]'::jsonb,
  study_notes jsonb DEFAULT '{}'::jsonb,
  diploma_conferred boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.university_student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own profile"
  ON public.university_student_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff view all student profiles"
  ON public.university_student_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

CREATE TABLE IF NOT EXISTS public.university_artist_overrides (
  artist_id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_email text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.university_artist_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view artist overrides"
  ON public.university_artist_overrides
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Superusers manage artist overrides"
  ON public.university_artist_overrides
  FOR ALL
  TO authenticated
  USING (public.is_superuser())
  WITH CHECK (public.is_superuser());
