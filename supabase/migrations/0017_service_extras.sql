-- Admin decides, per service, which optional package extras (travel & stay, location, makeup, costume) photographers
-- can fill in and customers see. Default true keeps existing behaviour; admin switches off what does not apply (e.g. makeup for birthdays).

ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS travel_stay_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS location_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS makeup_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS costume_enabled boolean NOT NULL DEFAULT true;
