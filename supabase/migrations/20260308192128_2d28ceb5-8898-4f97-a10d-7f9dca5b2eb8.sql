
CREATE TABLE public.page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Everyone can view visits (for admin dashboard)
CREATE POLICY "Visits viewable by everyone" ON public.page_visits FOR SELECT USING (true);

-- Everyone can insert visits
CREATE POLICY "Anyone can insert visits" ON public.page_visits FOR INSERT WITH CHECK (true);

-- Admins can manage
CREATE POLICY "Admins can manage visits" ON public.page_visits FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
