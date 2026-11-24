-- Migration: Add triggers, constraints, and package image limits
-- This migration adds:
-- 1. Updated_at triggers for tables with updated_at columns
-- 2. Package image count constraint (3-5 images per package)
-- 3. Trigger 13 cascade correction for photographer deletion

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smartphone_brands_updated_at
    BEFORE UPDATE ON public.smartphone_brands
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smartphone_models_updated_at
    BEFORE UPDATE ON public.smartphone_models
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_states_updated_at
    BEFORE UPDATE ON public.states
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cities_updated_at
    BEFORE UPDATE ON public.cities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_photographers_updated_at
    BEFORE UPDATE ON public.photographers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_packages_updated_at
    BEFORE UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_segments_updated_at
    BEFORE UPDATE ON public.portfolio_segments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_images_updated_at
    BEFORE UPDATE ON public.portfolio_images
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homepage_banners_updated_at
    BEFORE UPDATE ON public.homepage_banners
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homepage_featured_items_updated_at
    BEFORE UPDATE ON public.homepage_featured_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Package image count validation (3-5 images per package)
CREATE OR REPLACE FUNCTION public.validate_package_image_count()
RETURNS TRIGGER AS $$
DECLARE
    image_count INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT COUNT(*) INTO image_count
        FROM public.package_images
        WHERE package_id = NEW.package_id;
        
        IF image_count > 5 THEN
            RAISE EXCEPTION 'Package cannot have more than 5 images';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT COUNT(*) INTO image_count
        FROM public.package_images
        WHERE package_id = OLD.package_id;
        
        IF image_count < 3 THEN
            RAISE EXCEPTION 'Package must have at least 3 images';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_package_image_count_trigger
    AFTER INSERT OR DELETE ON public.package_images
    FOR EACH ROW EXECUTE FUNCTION public.validate_package_image_count();

-- Trigger 13: Cascade correction for photographer deletion
-- Ensures proper cleanup when a photographer is deleted
CREATE OR REPLACE FUNCTION public.cascade_photographer_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Disable the package_images trigger temporarily to avoid constraint conflicts
    ALTER TABLE public.package_images DISABLE TRIGGER validate_package_image_count_trigger;
    
    -- Delete portfolio images for segments belonging to this photographer
    DELETE FROM public.portfolio_images
    WHERE segment_id IN (
        SELECT id FROM public.portfolio_segments WHERE photographer_id = OLD.id
    );
    
    -- Delete portfolio segments
    DELETE FROM public.portfolio_segments
    WHERE photographer_id = OLD.id;
    
    -- Delete packages (this will cascade to package_images via FK)
    DELETE FROM public.packages
    WHERE photographer_id = OLD.id;
    
    -- Delete photographer_services
    DELETE FROM public.photographer_services
    WHERE photographer_id = OLD.id;
    
    -- Delete photographer_devices
    DELETE FROM public.photographer_devices
    WHERE photographer_id = OLD.id;
    
    -- Delete service_reviews for this photographer
    DELETE FROM public.service_reviews
    WHERE photographer_id = OLD.id;
    
    -- Set homepage_featured_items photographer_id to NULL
    UPDATE public.homepage_featured_items
    SET photographer_id = NULL
    WHERE photographer_id = OLD.id;
    
    -- Re-enable the trigger
    ALTER TABLE public.package_images ENABLE TRIGGER validate_package_image_count_trigger;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cascade_photographer_deletion_trigger
    BEFORE DELETE ON public.photographers
    FOR EACH ROW EXECUTE FUNCTION public.cascade_photographer_deletion();

-- Constraint: Ensure package has 3-5 images when status is published
CREATE OR REPLACE FUNCTION public.validate_package_publish_images()
RETURNS TRIGGER AS $$
DECLARE
    image_count INTEGER;
BEGIN
    IF NEW.status = 'published' AND OLD.status != 'published' THEN
        SELECT COUNT(*) INTO image_count
        FROM public.package_images
        WHERE package_id = NEW.id;
        
        IF image_count < 3 OR image_count > 5 THEN
            RAISE EXCEPTION 'Published package must have between 3 and 5 images';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_package_publish_images_trigger
    BEFORE UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION public.validate_package_publish_images();