-- Optional logo/image for a state, shown in the homepage location strip next to city logos.
ALTER TABLE public.states ADD COLUMN IF NOT EXISTS image_url text;
