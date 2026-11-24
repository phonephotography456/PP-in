-- Package pricing: base_price (original) + offer_price (selling price). Additive; legacy "price" is KEPT.
--
-- Migration: every existing package gets base_price = offer_price = price, so nothing is lost and no
-- package suddenly shows a discount. "price" stays NOT NULL and mirrors offer_price (the selling price)
-- via sync trigger, so any not-yet-migrated reader/writer keeps working. Drop "price" in a later
-- migration, only after all references are verified gone.
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS base_price numeric(10, 2);
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS offer_price numeric(10, 2);

UPDATE public.packages SET offer_price = price WHERE offer_price IS NULL;
UPDATE public.packages SET base_price = GREATEST(offer_price, price) WHERE base_price IS NULL;

ALTER TABLE public.packages ALTER COLUMN base_price SET NOT NULL;
ALTER TABLE public.packages ALTER COLUMN offer_price SET NOT NULL;

ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_offer_price_positive;
ALTER TABLE public.packages ADD CONSTRAINT packages_offer_price_positive CHECK (offer_price > 0);
ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_base_gte_offer;
ALTER TABLE public.packages ADD CONSTRAINT packages_base_gte_offer CHECK (base_price >= offer_price);

CREATE INDEX IF NOT EXISTS packages_offer_price_idx ON public.packages (offer_price);

-- Keeps price == offer_price. Fires before the guard triggers (alphabetical order).
-- INSERT may omit offer/base (legacy writers pass only price). UPDATE of legacy price alone moves offer_price.
CREATE OR REPLACE FUNCTION public.sync_package_prices()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.offer_price := COALESCE(NEW.offer_price, NEW.price);
        NEW.base_price := COALESCE(NEW.base_price, NEW.offer_price);
    ELSIF NEW.offer_price IS NOT DISTINCT FROM OLD.offer_price AND NEW.price IS DISTINCT FROM OLD.price THEN
        NEW.offer_price := NEW.price;
        NEW.base_price := GREATEST(NEW.base_price, NEW.offer_price);
    END IF;
    NEW.price := NEW.offer_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS a_sync_package_prices_trigger ON public.packages;
CREATE TRIGGER a_sync_package_prices_trigger
    BEFORE INSERT OR UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION public.sync_package_prices();

-- Editing either price of a published package sends it back to review (was: price).
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
        NEW.name IS DISTINCT FROM OLD.name OR NEW.base_price IS DISTINCT FROM OLD.base_price
        OR NEW.offer_price IS DISTINCT FROM OLD.offer_price
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

