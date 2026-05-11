-- Ensure report_settings column exists and refresh PostgREST schema cache
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS report_settings jsonb;

NOTIFY pgrst, 'reload schema';
