-- Add per-live-exam negative marking override.
-- NULL means: fall back to the underlying exam's negative_marking.
ALTER TABLE public.live_exams
  ADD COLUMN IF NOT EXISTS negative_marking NUMERIC;
