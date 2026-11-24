-- Admin switches homepage sections on/off. A section with no row is shown (default on).
CREATE TABLE IF NOT EXISTS public.homepage_sections (
    key text PRIMARY KEY,
    is_active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homepage_sections_public_read" ON public.homepage_sections
    FOR SELECT USING (true);

CREATE POLICY "homepage_sections_admin_all" ON public.homepage_sections
    FOR ALL USING (public.is_admin());

GRANT SELECT ON public.homepage_sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated;

CREATE TRIGGER update_homepage_sections_updated_at
    BEFORE UPDATE ON public.homepage_sections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
