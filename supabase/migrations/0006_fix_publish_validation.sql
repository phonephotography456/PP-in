-- Migration: Fix publish-validation bypass
-- Ensures ALL transitions into 'published' or 'pending_review' validate 3-5 images

CREATE OR REPLACE FUNCTION public.validate_package_publish_images()
RETURNS TRIGGER AS $$
DECLARE
    image_count INTEGER;
BEGIN
    -- Validate whenever status changes TO published OR pending_review
    -- (regardless of previous status)
    IF NEW.status IN ('published', 'pending_review')
       AND OLD.status IS DISTINCT FROM NEW.status THEN
        SELECT COUNT(*) INTO image_count
        FROM public.package_images
        WHERE package_id = NEW.id;
        
        IF image_count < 3 OR image_count > 5 THEN
            RAISE EXCEPTION 'Package must have between 3 and 5 images to submit for review or publish';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;