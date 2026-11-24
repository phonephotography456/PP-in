-- Phase 5 uploads: race-safe image limits. Additive; RLS and existing triggers untouched.
-- Package images: same 5-image cap as before, but serialised per package so concurrent uploads cannot exceed it.
CREATE OR REPLACE FUNCTION public.validate_package_image_count()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
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
        IF pkg_status = 'published' THEN
            UPDATE public.packages SET status = 'pending_review', updated_at = NOW() WHERE id = OLD.package_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

-- Portfolio: at most 50 images per photographer. Admin-deactivated images are kept for history and do not count.
CREATE OR REPLACE FUNCTION public.validate_portfolio_image_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE
    pid UUID;
    image_count INTEGER;
BEGIN
    SELECT photographer_id INTO pid FROM public.portfolio_segments WHERE id = NEW.segment_id;
    PERFORM pg_advisory_xact_lock(hashtextextended('portfolio:' || pid::text, 0));
    SELECT COUNT(*) INTO image_count
    FROM public.portfolio_images i
    JOIN public.portfolio_segments s ON s.id = i.segment_id
    WHERE s.photographer_id = pid AND i.status <> 'inactive';
    IF image_count >= 50 THEN
        RAISE EXCEPTION 'Portfolio cannot have more than 50 images';
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_portfolio_image_limit_trigger ON public.portfolio_images;
CREATE TRIGGER validate_portfolio_image_limit_trigger
    BEFORE INSERT ON public.portfolio_images
    FOR EACH ROW EXECUTE FUNCTION public.validate_portfolio_image_limit();
