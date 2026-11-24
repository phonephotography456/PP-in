-- Optional logo/image for a city, shown in the homepage city strip. NULL = initial-letter circle.
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS image_url text;
