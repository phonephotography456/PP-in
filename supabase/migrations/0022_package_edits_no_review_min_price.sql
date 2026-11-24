-- Package edits (text, prices, YouTube link, images) no longer send a live package back to review: they apply immediately.
-- Publishing a new package is still an admin decision. A live package must keep at least one image.
-- Minimum price: no base or offer price below 1999.

UPDATE public.packages
   SET base_price = GREATEST(base_price, 1999), offer_price = GREATEST(offer_price, 1999)
 WHERE base_price < 1999 OR offer_price < 1999;

ALTER TABLE public.packages
    ADD CONSTRAINT packages_offer_price_min CHECK (offer_price >= 1999),
    ADD CONSTRAINT packages_base_price_min CHECK (base_price >= 1999);

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
    END IF;
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.guard_package_image_owner_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    pid UUID;
BEGIN
    IF auth.uid() IS NULL OR public.is_admin() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    SELECT photographer_id INTO pid FROM public.packages WHERE id = COALESCE(NEW.package_id, OLD.package_id);
    IF pid IS NOT NULL AND public.photographer_content_locked(pid) THEN
        RAISE EXCEPTION 'This account can no longer change package images' USING ERRCODE = '42501';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.validate_package_image_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    image_count INTEGER;
    pkg_status public.package_status;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_advisory_xact_lock(hashtextextended(NEW.package_id::text, 0));
        SELECT COUNT(*) INTO image_count FROM public.package_images WHERE package_id = NEW.package_id;
        IF image_count > 5 THEN
            RAISE EXCEPTION 'Package cannot have more than 5 images';
        END IF;
    ELSIF TG_OP = 'DELETE' AND COALESCE(current_setting('app.cascade_delete', true), '') <> '1' THEN
        SELECT status INTO pkg_status FROM public.packages WHERE id = OLD.package_id;
        IF pkg_status = 'published' AND NOT EXISTS (SELECT 1 FROM public.package_images WHERE package_id = OLD.package_id AND id <> OLD.id) THEN
            RAISE EXCEPTION 'A live package needs at least one image' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;
