-- A package needs one banner image (the main picture on its card) instead of 3-5 images.
-- Existing packages with 2-5 images stay valid (upper bound unchanged); the app now allows exactly one new image.

CREATE OR REPLACE FUNCTION public.validate_package_publish_images()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    image_count INTEGER;
BEGIN
    IF NEW.status IN ('published', 'pending_review')
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NOT (OLD.status = 'published' AND NEW.status = 'pending_review') THEN
        SELECT COUNT(*) INTO image_count FROM public.package_images WHERE package_id = NEW.id;
        IF image_count < 1 OR image_count > 5 THEN
            RAISE EXCEPTION 'Package needs a banner image to submit for review or publish';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;
