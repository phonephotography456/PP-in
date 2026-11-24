-- Phase 2 Correction Migration
-- This migration fixes:
-- 1. Rename photographer_devices to photographer_phones (per approved schema)
-- 2. Remove user_roles table (not in approved design - roles managed via Supabase Auth)
-- 3. Fix package deletion cascade - allow cascade without min-image constraint blocking
-- 4. Add rule: independent image deletion from published package resets to pending_review
-- 5. Add proper Trigger 13 with parent-exists guard and actor checks

-- ============================================
-- 1. SCHEMA RECONCILIATION
-- ============================================

-- Rename photographer_devices to photographer_phones
ALTER TABLE public.photographer_devices RENAME TO photographer_phones;
ALTER INDEX public.photographer_devices_pkey RENAME TO photographer_phones_pkey;
ALTER INDEX public.photographer_devices_model_id_idx RENAME TO photographer_phones_model_id_idx;
ALTER INDEX public.photographer_devices_photographer_id_idx RENAME TO photographer_phones_photographer_id_idx;
ALTER INDEX public.photographer_devices_photographer_model_unique RENAME TO photographer_phones_photographer_model_unique;

-- Update foreign key constraint names
ALTER TABLE public.photographer_phones 
    RENAME CONSTRAINT photographer_devices_model_id_smartphone_models_id_fk 
    TO photographer_phones_model_id_smartphone_models_id_fk;

ALTER TABLE public.photographer_phones 
    RENAME CONSTRAINT photographer_devices_photographer_id_photographers_id_fk 
    TO photographer_phones_photographer_id_photographers_id_fk;

-- Update RLS policies for renamed table
DROP POLICY IF EXISTS "photographer_devices_admin_all" ON public.photographer_phones;
DROP POLICY IF EXISTS "photographer_devices_owner_all" ON public.photographer_phones;
DROP POLICY IF EXISTS "photographer_devices_public_read" ON public.photographer_phones;

CREATE POLICY "photographer_phones_admin_all" ON public.photographer_phones
    FOR ALL USING (public.is_admin());

CREATE POLICY "photographer_phones_owner_all" ON public.photographer_phones
    FOR ALL USING (public.is_photographer_owner(photographer_id));

CREATE POLICY "photographer_phones_public_read" ON public.photographer_phones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.photographers
            WHERE id = photographer_phones.photographer_id
            AND status = 'approved'
        )
    );

-- Drop user_roles table (not in approved design - roles managed via Supabase Auth)
DROP TABLE IF EXISTS public.user_roles;

-- ============================================
-- 2. FIX PACKAGE IMAGES TRIGGER
-- ============================================

-- Drop and recreate the validate_package_image_count function
-- New behavior:
-- - INSERT: enforce max 5 images
-- - DELETE: 
--   * If package is published and image is independently deleted (not cascade), reset package to pending_review
--   * Allow deletion during cascade (when parent package/photographer is being deleted)
--   * Don't enforce min 3 during cascade operations

CREATE OR REPLACE FUNCTION public.validate_package_image_count()
RETURNS TRIGGER AS $$
DECLARE
    image_count INTEGER;
    pkg_status package_status;
    is_cascade BOOLEAN := FALSE;
BEGIN
    -- Check if this is a cascade operation by checking if parent package exists
    IF TG_OP = 'DELETE' THEN
        -- Check if the parent package still exists
        SELECT status INTO pkg_status 
        FROM public.packages 
        WHERE id = OLD.package_id;
        
        -- If package doesn't exist, this is a cascade delete - allow it
        IF pkg_status IS NULL THEN
            is_cascade := TRUE;
        END IF;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        SELECT COUNT(*) INTO image_count
        FROM public.package_images
        WHERE package_id = NEW.package_id;
        
        IF image_count > 5 THEN
            RAISE EXCEPTION 'Package cannot have more than 5 images';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Only enforce min 3 and reset-to-pending for independent deletions (not cascade)
        IF NOT is_cascade THEN
            SELECT COUNT(*) INTO image_count
            FROM public.package_images
            WHERE package_id = OLD.package_id;
            
            -- Get the package status before deletion
            SELECT status INTO pkg_status
            FROM public.packages
            WHERE id = OLD.package_id;
            
            -- If package was published and we're deleting an image, reset to pending_review
            IF pkg_status = 'published' THEN
                UPDATE public.packages
                SET status = 'pending_review',
                    updated_at = NOW()
                WHERE id = OLD.package_id;
            END IF;
            
            -- Note: We don't enforce minimum 3 here for independent deletions
            -- The 3-5 requirement is enforced at publish/submit-review time
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. ADD TRIGGERS FOR CASCADE DELETIONS
-- ============================================

-- Trigger for package deletion (cascades to package_images)
CREATE OR REPLACE FUNCTION public.cascade_package_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Disable the package_images trigger temporarily to avoid constraint conflicts
    ALTER TABLE public.package_images DISABLE TRIGGER validate_package_image_count_trigger;
    
    -- Delete package images (FK cascade would do this, but we need trigger disabled)
    DELETE FROM public.package_images
    WHERE package_id = OLD.id;
    
    -- Re-enable the trigger
    ALTER TABLE public.package_images ENABLE TRIGGER validate_package_image_count_trigger;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cascade_package_deletion_trigger
    BEFORE DELETE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION public.cascade_package_deletion();

-- Trigger for photographer_service deletion (cascades to packages then package_images)
CREATE OR REPLACE FUNCTION public.cascade_photographer_service_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Disable the package_images trigger temporarily
    ALTER TABLE public.package_images DISABLE TRIGGER validate_package_image_count_trigger;
    
    -- Delete package images for packages belonging to this photographer_service
    DELETE FROM public.package_images
    WHERE package_id IN (
        SELECT id FROM public.packages 
        WHERE photographer_id = OLD.photographer_id 
        AND service_id = OLD.service_id
    );
    
    -- Delete packages for this photographer_service
    DELETE FROM public.packages
    WHERE photographer_id = OLD.photographer_id
    AND service_id = OLD.service_id;
    
    -- Re-enable the trigger
    ALTER TABLE public.package_images ENABLE TRIGGER validate_package_image_count_trigger;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cascade_photographer_service_deletion_trigger
    BEFORE DELETE ON public.photographer_services
    FOR EACH ROW EXECUTE FUNCTION public.cascade_photographer_service_deletion();

-- ============================================
-- 4. UPDATE TRIGGER 13 - PHOTOGRAPHER DELETION CASCADE
-- ============================================

-- Enhanced Trigger 13 with parent-exists guard and actor checks
-- Uses auth.uid() and is_admin() for authorization
CREATE OR REPLACE FUNCTION public.cascade_photographer_deletion()
RETURNS TRIGGER AS $$
DECLARE
    v_actor UUID := auth.uid();
    v_is_admin BOOLEAN := public.is_admin();
    v_is_owner BOOLEAN := public.is_photographer_owner(OLD.id);
BEGIN
    -- Actor check: only photographer owner or admin can delete
    IF NOT (v_is_owner OR v_is_admin) THEN
        RAISE EXCEPTION 'Insufficient privileges to delete photographer profile';
    END IF;
    
    -- Parent-exists guard: photographer must exist
    IF NOT EXISTS (SELECT 1 FROM public.photographers WHERE id = OLD.id) THEN
        RAISE EXCEPTION 'Photographer not found';
    END IF;
    
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
    
    -- Delete package images for packages belonging to this photographer
    DELETE FROM public.package_images
    WHERE package_id IN (
        SELECT id FROM public.packages WHERE photographer_id = OLD.id
    );
    
    -- Delete packages
    DELETE FROM public.packages
    WHERE photographer_id = OLD.id;
    
    -- Delete photographer_services
    DELETE FROM public.photographer_services
    WHERE photographer_id = OLD.id;
    
    -- Delete photographer_phones (renamed from photographer_devices)
    DELETE FROM public.photographer_phones
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on the updated function
GRANT EXECUTE ON FUNCTION public.cascade_photographer_deletion() TO anon, authenticated, service_role;

-- ============================================
-- 5. UPDATE PACKAGE PUBLISH VALIDATION
-- ============================================

-- The validate_package_publish_images function already enforces 3-5 images on publish
-- No changes needed - it correctly enforces the requirement at publish time

-- ============================================
-- 6. UPDATE GRANTS FOR RENAMED TABLE
-- ============================================

GRANT SELECT ON public.photographer_phones TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.photographer_phones TO authenticated;
GRANT ALL ON public.photographer_phones TO service_role;

-- ============================================
-- 7. UPDATE DRIZZLE SCHEMA REFERENCES
-- ============================================

-- This migration handles database-level changes.
-- Drizzle schema files need to be updated separately.