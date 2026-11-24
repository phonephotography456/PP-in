-- Migration: Add Row Level Security (RLS) policies
-- This migration enables RLS on all public tables and creates policies for:
-- - anon (public read access for approved content)
-- - authenticated (photographers can manage their own data)
-- - service_role (admin full access)

-- Enable RLS on all tables
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smartphone_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smartphone_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photographer_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photographer_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_featured_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is the photographer owner
CREATE OR REPLACE FUNCTION public.is_photographer_owner(photographer_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.photographers
        WHERE id = photographer_uuid
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SERVICES: Public read active, admin write
-- ============================================
CREATE POLICY "services_public_read_active" ON public.services
    FOR SELECT USING (status = 'active');

CREATE POLICY "services_admin_all" ON public.services
    FOR ALL USING (public.is_admin());

-- ============================================
-- SMARTPHONE BRANDS: Public read active, admin write
-- ============================================
CREATE POLICY "smartphone_brands_public_read_active" ON public.smartphone_brands
    FOR SELECT USING (status = 'active');

CREATE POLICY "smartphone_brands_admin_all" ON public.smartphone_brands
    FOR ALL USING (public.is_admin());

-- ============================================
-- SMARTPHONE MODELS: Public read active, admin write
-- ============================================
CREATE POLICY "smartphone_models_public_read_active" ON public.smartphone_models
    FOR SELECT USING (status = 'active');

CREATE POLICY "smartphone_models_admin_all" ON public.smartphone_models
    FOR ALL USING (public.is_admin());

-- ============================================
-- STATES: Public read active, admin write
-- ============================================
CREATE POLICY "states_public_read_active" ON public.states
    FOR SELECT USING (is_active = true);

CREATE POLICY "states_admin_all" ON public.states
    FOR ALL USING (public.is_admin());

-- ============================================
-- CITIES: Public read active, admin write
-- ============================================
CREATE POLICY "cities_public_read_active" ON public.cities
    FOR SELECT USING (is_active = true);

CREATE POLICY "cities_admin_all" ON public.cities
    FOR ALL USING (public.is_admin());

-- ============================================
-- PHOTOGRAPHERS: Public read approved, photographer manage own, admin all
-- ============================================
CREATE POLICY "photographers_public_read_approved" ON public.photographers
    FOR SELECT USING (status = 'approved');

CREATE POLICY "photographers_owner_read_own" ON public.photographers
    FOR SELECT USING (public.is_photographer_owner(id));

CREATE POLICY "photographers_owner_update_own" ON public.photographers
    FOR UPDATE USING (public.is_photographer_owner(id));

CREATE POLICY "photographers_admin_all" ON public.photographers
    FOR ALL USING (public.is_admin());

-- ============================================
-- PHOTOGRAPHER SERVICES: Photographer manage own, admin all, public read for approved photographers
-- ============================================
CREATE POLICY "photographer_services_public_read" ON public.photographer_services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.photographers
            WHERE id = photographer_services.photographer_id
            AND status = 'approved'
        )
    );

CREATE POLICY "photographer_services_owner_all" ON public.photographer_services
    FOR ALL USING (public.is_photographer_owner(photographer_id));

CREATE POLICY "photographer_services_admin_all" ON public.photographer_services
    FOR ALL USING (public.is_admin());

-- ============================================
-- PHOTOGRAPHER DEVICES: Photographer manage own, admin all, public read for approved photographers
-- ============================================
CREATE POLICY "photographer_devices_public_read" ON public.photographer_devices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.photographers
            WHERE id = photographer_devices.photographer_id
            AND status = 'approved'
        )
    );

CREATE POLICY "photographer_devices_owner_all" ON public.photographer_devices
    FOR ALL USING (public.is_photographer_owner(photographer_id));

CREATE POLICY "photographer_devices_admin_all" ON public.photographer_devices
    FOR ALL USING (public.is_admin());

-- ============================================
-- PACKAGES: Public read published for approved photographers, photographer manage own, admin all
-- ============================================
CREATE POLICY "packages_public_read_published" ON public.packages
    FOR SELECT USING (
        status = 'published'
        AND EXISTS (
            SELECT 1 FROM public.photographers
            WHERE id = packages.photographer_id
            AND status = 'approved'
        )
    );

CREATE POLICY "packages_owner_all" ON public.packages
    FOR ALL USING (public.is_photographer_owner(photographer_id));

CREATE POLICY "packages_admin_all" ON public.packages
    FOR ALL USING (public.is_admin());

-- ============================================
-- PACKAGE IMAGES: Public read for published packages, photographer manage own, admin all
-- ============================================
CREATE POLICY "package_images_public_read" ON public.package_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.packages p
            JOIN public.photographers ph ON ph.id = p.photographer_id
            WHERE p.id = package_images.package_id
            AND p.status = 'published'
            AND ph.status = 'approved'
        )
    );

CREATE POLICY "package_images_owner_all" ON public.package_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.packages p
            WHERE p.id = package_images.package_id
            AND public.is_photographer_owner(p.photographer_id)
        )
    );

CREATE POLICY "package_images_admin_all" ON public.package_images
    FOR ALL USING (public.is_admin());

-- ============================================
-- PORTFOLIO SEGMENTS: Public read for approved photographers, photographer manage own, admin all
-- ============================================
CREATE POLICY "portfolio_segments_public_read" ON public.portfolio_segments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.photographers
            WHERE id = portfolio_segments.photographer_id
            AND status = 'approved'
        )
    );

CREATE POLICY "portfolio_segments_owner_all" ON public.portfolio_segments
    FOR ALL USING (public.is_photographer_owner(photographer_id));

CREATE POLICY "portfolio_segments_admin_all" ON public.portfolio_segments
    FOR ALL USING (public.is_admin());

-- ============================================
-- PORTFOLIO IMAGES: Public read approved for approved photographers, photographer manage own, admin all
-- ============================================
CREATE POLICY "portfolio_images_public_read_approved" ON public.portfolio_images
    FOR SELECT USING (
        status = 'approved'
        AND EXISTS (
            SELECT 1 FROM public.portfolio_segments ps
            JOIN public.photographers ph ON ph.id = ps.photographer_id
            WHERE ps.id = portfolio_images.segment_id
            AND ph.status = 'approved'
        )
    );

CREATE POLICY "portfolio_images_owner_all" ON public.portfolio_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.portfolio_segments ps
            WHERE ps.id = portfolio_images.segment_id
            AND public.is_photographer_owner(ps.photographer_id)
        )
    );

CREATE POLICY "portfolio_images_admin_all" ON public.portfolio_images
    FOR ALL USING (public.is_admin());

-- ============================================
-- HOMEPAGE BANNERS: Public read active, admin write
-- ============================================
CREATE POLICY "homepage_banners_public_read_active" ON public.homepage_banners
    FOR SELECT USING (is_active = true);

CREATE POLICY "homepage_banners_admin_all" ON public.homepage_banners
    FOR ALL USING (public.is_admin());

-- ============================================
-- HOMEPAGE FEATURED ITEMS: Public read active, admin write
-- ============================================
CREATE POLICY "homepage_featured_items_public_read_active" ON public.homepage_featured_items
    FOR SELECT USING (is_active = true);

CREATE POLICY "homepage_featured_items_admin_all" ON public.homepage_featured_items
    FOR ALL USING (public.is_admin());

-- ============================================
-- SERVICE REVIEWS: Public read approved, reviewer read own, admin all
-- ============================================
CREATE POLICY "service_reviews_public_read_approved" ON public.service_reviews
    FOR SELECT USING (status = 'approved');

CREATE POLICY "service_reviews_reviewer_read_own" ON public.service_reviews
    FOR SELECT USING (reviewer_user_id = auth.uid());

CREATE POLICY "service_reviews_reviewer_insert_own" ON public.service_reviews
    FOR INSERT WITH CHECK (reviewer_user_id = auth.uid());

CREATE POLICY "service_reviews_admin_all" ON public.service_reviews
    FOR ALL USING (public.is_admin());