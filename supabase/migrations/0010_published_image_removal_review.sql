-- Phase 5 follow-up: removing an image from a PUBLISHED package must send it to pending_review.
-- 0005 already downgrades published -> pending_review after an image delete, but 0006's
-- validate_package_publish_images then rejected the downgrade whenever fewer than 3 images remained,
-- so the delete failed. The 3-5 image rule still gates submission (draft/rejected -> pending_review)
-- and publication (-> published); only the automatic published -> pending_review downgrade is exempt.
-- A package with <3 images cannot be published: the admin publish transition still enforces 3-5.
CREATE OR REPLACE FUNCTION public.validate_package_publish_images()
RETURNS TRIGGER AS $$
DECLARE
    image_count INTEGER;
BEGIN
    IF NEW.status IN ('published', 'pending_review')
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NOT (OLD.status = 'published' AND NEW.status = 'pending_review') THEN
        SELECT COUNT(*) INTO image_count FROM public.package_images WHERE package_id = NEW.id;
        IF image_count < 3 OR image_count > 5 THEN
            RAISE EXCEPTION 'Package must have between 3 and 5 images to submit for review or publish';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Deleting a package / photographer service failed for photographers with "Not authorized" (42501):
-- 0005's cascade triggers ran ALTER TABLE ... DISABLE TRIGGER, which needs table ownership.
-- Replace with a transaction-local flag that validate_package_image_count honours.
CREATE OR REPLACE FUNCTION public.validate_package_image_count()
RETURNS TRIGGER AS $$
DECLARE
    image_count INTEGER;
    pkg_status public.package_status;
BEGIN
    IF TG_OP = 'INSERT' THEN
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
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.cascade_package_deletion()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM set_config('app.cascade_delete', '1', true);
    DELETE FROM public.package_images WHERE package_id = OLD.id;
    PERFORM set_config('app.cascade_delete', '', true);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.cascade_photographer_service_deletion()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM set_config('app.cascade_delete', '1', true);
    DELETE FROM public.package_images WHERE package_id IN (
        SELECT id FROM public.packages WHERE photographer_id = OLD.photographer_id AND service_id = OLD.service_id);
    PERFORM set_config('app.cascade_delete', '', true);
    DELETE FROM public.packages WHERE photographer_id = OLD.photographer_id AND service_id = OLD.service_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = '';
