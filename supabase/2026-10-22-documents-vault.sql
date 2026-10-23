-- =========================================================================
-- Thunder House ENT: Document Vault & Legal Document Manager
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.thunderhouse_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL, -- 'split_sheet', 'client_quote', 'photo_release', 'performance_contract', 'work_for_hire', 'gear_rental', 'custom'
  title TEXT NOT NULL,
  reference_no TEXT,
  status TEXT DEFAULT 'Draft', -- 'Draft', 'Final', 'Executed', 'Archived'
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_html TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.thunderhouse_documents ENABLE ROW LEVEL SECURITY;

-- Allow Staff to manage documents
DROP POLICY IF EXISTS "Staff manage documents" ON public.thunderhouse_documents;
CREATE POLICY "Staff manage documents"
  ON public.thunderhouse_documents
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_th_docs_type ON public.thunderhouse_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_th_docs_updated ON public.thunderhouse_documents(updated_at DESC);
