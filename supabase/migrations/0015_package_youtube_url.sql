-- Phase 9 follow-up: optional YouTube video per package, shown in the service portfolio (max 3 videos = one per level).
--  * Only canonical watch URLs with an 11-character video id are stored (the app normalises youtu.be / shorts / embed links),
--    so the value can be turned into an embed URL without any further trust in user input.
--  * Editing the video of a live package goes back through review like any other live content change.

ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS youtube_url varchar(100);
ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_youtube_url_format;
ALTER TABLE public.packages ADD CONSTRAINT packages_youtube_url_format
    CHECK (youtube_url IS NULL OR youtube_url ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$');

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
    ) THEN
        -- Edited live content goes back through review (validate_package_publish_images re-checks 3-5 images).
        NEW.status := 'pending_review';
    END IF;
    RETURN NEW;
END;
$function$;
