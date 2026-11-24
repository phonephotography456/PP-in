-- Phase 4: admin panel write access (additive; no tables or policies changed).
--
-- Mismatch found: 0002 created "<table>_admin_all" RLS policies for the master-data, location,
-- homepage and review tables, but 0003 granted `authenticated` only SELECT (INSERT on reviews).
-- Without table privileges those policies are never reached, so admin writes under RLS fail
-- with "permission denied". Grant the missing DML privileges. RLS stays the gate: the only
-- write policy on each of these tables is *_admin_all (is_admin()), plus the existing
-- reviewer INSERT policy on service_reviews.
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.smartphone_brands TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.smartphone_models TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.states TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.homepage_banners TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.homepage_featured_items TO authenticated;
GRANT UPDATE, DELETE ON public.service_reviews TO authenticated;
