
CREATE TABLE public.wrong_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  exam_title TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_image TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  option_images JSONB,
  correct_answer TEXT NOT NULL,
  user_answer TEXT NOT NULL DEFAULT '',
  explanation TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wrong_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wrong answers viewable by everyone" ON public.wrong_answers FOR SELECT USING (true);
CREATE POLICY "Wrong answers insertable by everyone" ON public.wrong_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Wrong answers deletable by everyone" ON public.wrong_answers FOR DELETE USING (true);
