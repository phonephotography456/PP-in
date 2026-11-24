-- Admin picks which services get a section on the homepage. Start with the first 4 active services (the previous behaviour).
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;

UPDATE public.services SET show_on_home = true
 WHERE id IN (SELECT id FROM public.services WHERE status = 'active' ORDER BY sort_order, name LIMIT 4);
