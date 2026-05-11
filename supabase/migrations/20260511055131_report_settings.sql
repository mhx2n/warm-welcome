-- Add report_settings (PDF report theme + footer) to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS report_settings jsonb;
