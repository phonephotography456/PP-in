-- Migration: Grant permissions to Supabase roles
-- This migration grants appropriate permissions to anon, authenticated, and service_role

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions on all tables
GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT ON public.smartphone_brands TO anon, authenticated;
GRANT SELECT ON public.smartphone_models TO anon, authenticated;
GRANT SELECT ON public.states TO anon, authenticated;
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT SELECT ON public.photographers TO anon, authenticated;
GRANT SELECT ON public.photographer_services TO anon, authenticated;
GRANT SELECT ON public.photographer_devices TO anon, authenticated;
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT SELECT ON public.package_images TO anon, authenticated;
GRANT SELECT ON public.portfolio_segments TO anon, authenticated;
GRANT SELECT ON public.portfolio_images TO anon, authenticated;
GRANT SELECT ON public.homepage_banners TO anon, authenticated;
GRANT SELECT ON public.homepage_featured_items TO anon, authenticated;
GRANT SELECT ON public.service_reviews TO anon, authenticated;

-- Grant full permissions to service_role (admin)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant insert/update/delete on specific tables for authenticated users (photographers)
-- These are controlled by RLS policies
GRANT INSERT, UPDATE, DELETE ON public.photographers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.photographer_services TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.photographer_devices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.package_images TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portfolio_segments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portfolio_images TO authenticated;
GRANT INSERT ON public.service_reviews TO authenticated;

-- Grant permissions on enums
GRANT USAGE ON TYPE public.brand_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.model_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.package_level TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.package_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.photographer_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.portfolio_image_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.review_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.service_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.user_role TO anon, authenticated, service_role;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_photographer_owner(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_package_image_count() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cascade_photographer_deletion() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_package_publish_images() TO anon, authenticated, service_role;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;