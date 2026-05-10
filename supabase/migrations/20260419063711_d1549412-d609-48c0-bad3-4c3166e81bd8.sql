-- ============= LIVE EXAMS =============
CREATE TABLE public.live_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60, -- minutes
  access_mode TEXT NOT NULL DEFAULT 'code', -- 'code' (paid) or 'open' (free for all logged-in)
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | live | ended | cancelled
  show_leaderboard BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Live exams viewable by authenticated users"
  ON public.live_exams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage live exams"
  ON public.live_exams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_live_exams_updated_at
  BEFORE UPDATE ON public.live_exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_live_exams_status ON public.live_exams(status);
CREATE INDEX idx_live_exams_start_time ON public.live_exams(start_time);

-- ============= ACCESS CODES =============
CREATE TABLE public.live_exam_access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_exam_id UUID REFERENCES public.live_exams(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL UNIQUE,
  assigned_to_user_id UUID, -- optional: pre-assigned to specific user
  used_by_user_id UUID,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_exam_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage access codes"
  ON public.live_exam_access_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own assigned codes"
  ON public.live_exam_access_codes FOR SELECT TO authenticated
  USING (assigned_to_user_id = auth.uid() OR used_by_user_id = auth.uid());

CREATE INDEX idx_access_codes_live_exam ON public.live_exam_access_codes(live_exam_id);
CREATE INDEX idx_access_codes_code ON public.live_exam_access_codes(code);

-- ============= PARTICIPANTS =============
CREATE TABLE public.live_exam_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_exam_id UUID REFERENCES public.live_exams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  negative_marks NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'joined', -- joined | in_progress | submitted | disqualified
  UNIQUE (live_exam_id, user_id)
);

ALTER TABLE public.live_exam_participants ENABLE ROW LEVEL SECURITY;

-- Public leaderboard view: any authenticated user can read participant scores
CREATE POLICY "Participants viewable for leaderboard"
  ON public.live_exam_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join (insert) self"
  ON public.live_exam_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own participation"
  ON public.live_exam_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage participants"
  ON public.live_exam_participants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_participants_live_exam ON public.live_exam_participants(live_exam_id);
CREATE INDEX idx_participants_user ON public.live_exam_participants(user_id);
CREATE INDEX idx_participants_score ON public.live_exam_participants(live_exam_id, score DESC, time_taken_seconds ASC);

-- ============= ANSWERS =============
CREATE TABLE public.live_exam_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES public.live_exam_participants(id) ON DELETE CASCADE NOT NULL,
  live_exam_id UUID REFERENCES public.live_exams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL,
  selected_answer TEXT NOT NULL DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_id, question_id)
);

ALTER TABLE public.live_exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own answers"
  ON public.live_exam_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own answers"
  ON public.live_exam_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own answers"
  ON public.live_exam_answers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all answers"
  ON public.live_exam_answers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_answers_participant ON public.live_exam_answers(participant_id);
CREATE INDEX idx_answers_live_exam ON public.live_exam_answers(live_exam_id);

-- ============= REALTIME =============
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_exam_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_exams;
ALTER TABLE public.live_exam_participants REPLICA IDENTITY FULL;
ALTER TABLE public.live_exams REPLICA IDENTITY FULL;

-- ============= HELPER: redeem access code =============
CREATE OR REPLACE FUNCTION public.redeem_live_exam_code(_code TEXT)
RETURNS UUID -- returns live_exam_id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, live_exam_id, assigned_to_user_id, used_by_user_id
  INTO v_record
  FROM public.live_exam_access_codes
  WHERE code = _code
  FOR UPDATE;

  IF v_record IS NULL THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;

  IF v_record.used_by_user_id IS NOT NULL AND v_record.used_by_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Code already used';
  END IF;

  IF v_record.assigned_to_user_id IS NOT NULL AND v_record.assigned_to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Code is assigned to another user';
  END IF;

  UPDATE public.live_exam_access_codes
  SET used_by_user_id = auth.uid(), used_at = COALESCE(used_at, now())
  WHERE id = v_record.id;

  RETURN v_record.live_exam_id;
END;
$$;