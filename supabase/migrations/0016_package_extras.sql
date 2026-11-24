-- Optional package "what else is covered" flags: travel & stay, location, makeup, costume.
-- NULL = photographer did not say (hidden on the site), true = included, false = not included.
-- Editing them on a live package goes back through review like any other live content change.

ALTER TABLE public.packages
    ADD COLUMN IF NOT EXISTS travel_stay_included boolean,
    ADD COLUMN IF NOT EXISTS location_included boolean,
    ADD COLUMN IF NOT EXISTS makeup_included boolean,
    ADD COLUMN IF NOT EXISTS costume_included boolean;

CREATE OR REPLACE FUNCTION public.guard_package_owner_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    IF auth.uid() IS NULL OR public.is_admin() THEN
        RETURN NEW;
    END IF;
    IF public.photographer_content_locked(COALESCE(NEW.photographer_id, OLD.photographer_id)) THEN
        RAISE EXCEPTION 'This account can no longer change packages' USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'draft' THEN
            RAISE EXCEPTION 'New packages must start as draft' USING ERRCODE = '42501';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.photographer_services ps
            JOIN public.services s ON s.id = ps.service_id
            WHERE ps.photographer_id = NEW.photographer_id AND ps.service_id = NEW.service_id AND s.status = 'active'
        ) THEN
            RAISE EXCEPTION 'Add an active service before creating its packages' USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE
    IF NEW.photographer_id <> OLD.photographer_id OR NEW.service_id <> OLD.service_id OR NEW.level <> OLD.level THEN
        RAISE EXCEPTION 'Package owner, service and level cannot be changed' USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Owners may only move between draft and pending_review (publishing is an admin decision).
        IF OLD.status = 'inactive' OR NEW.status NOT IN ('draft', 'pending_review') THEN
            RAISE EXCEPTION 'Only an admin can set package status to %', NEW.status USING ERRCODE = '42501';
        END IF;
    ELSIF OLD.status = 'published' AND (
        NEW.name IS DISTINCT FROM OLD.name OR NEW.base_price IS DISTINCT FROM OLD.base_price
        OR NEW.offer_price IS DISTINCT FROM OLD.offer_price
        OR NEW.short_description IS DISTINCT FROM OLD.short_description
        OR NEW.inclusions IS DISTINCT FROM OLD.inclusions
        OR NEW.detailed_description IS DISTINCT FROM OLD.detailed_description
        OR NEW.youtube_url IS DISTINCT FROM OLD.youtube_url
        OR NEW.travel_stay_included IS DISTINCT FROM OLD.travel_stay_included
        OR NEW.location_included IS DISTINCT FROM OLD.location_included
        OR NEW.makeup_included IS DISTINCT FROM OLD.makeup_included
        OR NEW.costume_included IS DISTINCT FROM OLD.costume_included
    ) THEN
        -- Edited live content goes back through review (validate_package_publish_images re-checks 3-5 images).
        NEW.status := 'pending_review';
    END IF;
    RETURN NEW;
END;
$function$;
