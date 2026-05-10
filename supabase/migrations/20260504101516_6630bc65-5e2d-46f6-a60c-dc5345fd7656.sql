-- Premium batches: groups admin can add users to
CREATE TABLE public.premium_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.premium_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Premium batches viewable by authenticated"
  ON public.premium_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage premium batches"
  ON public.premium_batches FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_premium_batches_updated
  BEFORE UPDATE ON public.premium_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Members of premium batches
CREATE TABLE public.premium_batch_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  premium_batch_id uuid NOT NULL REFERENCES public.premium_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(premium_batch_id, user_id)
);
CREATE INDEX idx_pbm_user ON public.premium_batch_members(user_id);
CREATE INDEX idx_pbm_batch ON public.premium_batch_members(premium_batch_id);
ALTER TABLE public.premium_batch_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own memberships"
  ON public.premium_batch_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage memberships"
  ON public.premium_batch_members FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Restrict regular exams to premium batches (optional)
CREATE TABLE public.exam_premium_batches (
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  premium_batch_id uuid NOT NULL REFERENCES public.premium_batches(id) ON DELETE CASCADE,
  PRIMARY KEY (exam_id, premium_batch_id)
);
ALTER TABLE public.exam_premium_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exam premium batches viewable"
  ON public.exam_premium_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage exam premium batches"
  ON public.exam_premium_batches FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));