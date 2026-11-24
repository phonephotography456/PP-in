-- Phase 5: photographer panel guards (additive; no tables, columns or policies dropped).
--
-- Gap found: the *_owner_all RLS policies let a photographer write ANY column of their own rows, so a
-- photographer could set packages.status = 'published' or portfolio_images.status = 'approved' directly
-- and skip moderation. These BEFORE triggers close that for non-admin callers (auth.uid() set, not admin).
-- Admins and service-role / migrations (auth.uid() IS NULL) are unaffected.

-- Rejected and inactive photographers keep their data but cannot change it. Pending ones may draft.
CREATE OR REPLACE FUNCTION public.photographer_content_locked(pid UUID)
RETURNS BOOLEAN AS $$
    SELECT auth.uid() IS NOT NULL AND NOT public.is_admin()
       AND EXISTS (SELECT 1 FROM public.photographers WHERE id = pid AND status IN ('rejected', 'inactive'));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';
GRANT EXECUTE ON FUNCTION public.photographer_content_locked(UUID) TO authenticated, service_role;

-- ---------- packages ----------
CREATE OR REPLACE FUNCTION public.guard_package_owner_changes()
RETURNS TRIGGER AS $$
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
        NEW.name IS DISTINCT FROM OLD.name OR NEW.price IS DISTINCT FROM OLD.price
        OR NEW.short_description IS DISTINCT FROM OLD.short_description
        OR NEW.inclusions IS DISTINCT FROM OLD.inclusions
        OR NEW.detailed_description IS DISTINCT FROM OLD.detailed_description
    ) THEN
        -- Edited live content goes back through review (validate_package_publish_images re-checks 3-5 images).
        NEW.status := 'pending_review';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Name sorts before validate_package_publish_images_trigger, so the image-count check sees the final status.
CREATE TRIGGER guard_package_owner_changes_trigger
    BEFORE INSERT OR UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION public.guard_package_owner_changes();

-- ---------- package images ----------
-- Adding/changing an image on a live package sends it back to review (deleting is already handled in 0005).
CREATE OR REPLACE FUNCTION public.guard_package_image_owner_changes()
RETURNS TRIGGER AS $$
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
    IF TG_OP <> 'DELETE' THEN
        UPDATE public.packages SET status = 'pending_review' WHERE id = NEW.package_id AND status = 'published';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER guard_package_image_owner_changes_trigger
    BEFORE INSERT OR UPDATE OR DELETE ON public.package_images
    FOR EACH ROW EXECUTE FUNCTION public.guard_package_image_owner_changes();

-- ---------- portfolio images ----------
CREATE OR REPLACE FUNCTION public.guard_portfolio_image_owner_changes()
RETURNS TRIGGER AS $$
DECLARE
    pid UUID;
BEGIN
    IF auth.uid() IS NULL OR public.is_admin() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    SELECT photographer_id INTO pid FROM public.portfolio_segments WHERE id = COALESCE(NEW.segment_id, OLD.segment_id);
    IF pid IS NOT NULL AND public.photographer_content_locked(pid) THEN
        RAISE EXCEPTION 'This account can no longer change portfolio images' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'pending_review' THEN
            RAISE EXCEPTION 'New portfolio images start as pending review' USING ERRCODE = '42501';
        END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Only an admin can change portfolio image status' USING ERRCODE = '42501';
    ELSIF NEW.image_url IS DISTINCT FROM OLD.image_url AND OLD.status <> 'inactive' THEN
        NEW.status := 'pending_review'; -- replaced picture must be re-reviewed
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER guard_portfolio_image_owner_changes_trigger
    BEFORE INSERT OR UPDATE OR DELETE ON public.portfolio_images
    FOR EACH ROW EXECUTE FUNCTION public.guard_portfolio_image_owner_changes();

-- ---------- segments + services ----------
CREATE OR REPLACE FUNCTION public.guard_photographer_child_locked()
RETURNS TRIGGER AS $$
BEGIN
    IF public.photographer_content_locked(COALESCE(NEW.photographer_id, OLD.photographer_id)) THEN
        RAISE EXCEPTION 'This account can no longer change this content' USING ERRCODE = '42501';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER guard_portfolio_segments_locked_trigger
    BEFORE INSERT OR UPDATE OR DELETE ON public.portfolio_segments
    FOR EACH ROW EXECUTE FUNCTION public.guard_photographer_child_locked();
CREATE TRIGGER guard_photographer_services_locked_trigger
    BEFORE INSERT OR UPDATE OR DELETE ON public.photographer_services
    FOR EACH ROW EXECUTE FUNCTION public.guard_photographer_child_locked();
CREATE TRIGGER guard_photographer_phones_locked_trigger
    BEFORE INSERT OR UPDATE OR DELETE ON public.photographer_phones
    FOR EACH ROW EXECUTE FUNCTION public.guard_photographer_child_locked();

-- New service links must point at an active service (existing links to later-deactivated services are kept).
CREATE OR REPLACE FUNCTION public.guard_photographer_service_active()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin()
       AND NOT EXISTS (SELECT 1 FROM public.services WHERE id = NEW.service_id AND status = 'active') THEN
        RAISE EXCEPTION 'That service is not available' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER guard_photographer_service_active_trigger
    BEFORE INSERT ON public.photographer_services
    FOR EACH ROW EXECUTE FUNCTION public.guard_photographer_service_active();

-- Same for smartphone models.
CREATE OR REPLACE FUNCTION public.guard_photographer_phone_active()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin()
       AND NOT EXISTS (
           SELECT 1 FROM public.smartphone_models m JOIN public.smartphone_brands b ON b.id = m.brand_id
           WHERE m.id = NEW.model_id AND m.status = 'active' AND b.status = 'active'
       ) THEN
        RAISE EXCEPTION 'That smartphone model is not available' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER guard_photographer_phone_active_trigger
    BEFORE INSERT ON public.photographer_phones
    FOR EACH ROW EXECUTE FUNCTION public.guard_photographer_phone_active();
