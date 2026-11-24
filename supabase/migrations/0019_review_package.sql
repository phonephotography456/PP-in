-- A review now belongs to one package (Basic / Standard / Premium) of a photographer's service.
--  * package_id is nullable only for reviews written before this change; every new review must name a package.
--  * ON DELETE CASCADE: deleting a package deletes the reviews written for it (the panel warns photographers first).
--  * One live review per customer per package (was: per photographer + service).

ALTER TABLE public.service_reviews
    ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.packages(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS service_reviews_package_id_idx ON public.service_reviews (package_id);

DROP INDEX IF EXISTS public.service_reviews_one_live_per_reviewer;
CREATE UNIQUE INDEX service_reviews_one_live_per_reviewer
    ON public.service_reviews (reviewer_user_id, photographer_id, service_id, COALESCE(package_id, '00000000-0000-0000-0000-000000000000'::uuid))
    WHERE status <> 'rejected';

-- The package must belong to that approved photographer + service and be published.
CREATE OR REPLACE FUNCTION public.review_package_is_public(p_photographer UUID, p_service UUID, p_package UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.photographers ph
        JOIN public.packages pk ON pk.photographer_id = ph.id
        WHERE ph.id = p_photographer AND ph.status = 'approved'
          AND pk.id = p_package AND pk.service_id = p_service AND pk.status = 'published'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
GRANT EXECUTE ON FUNCTION public.review_package_is_public(UUID, UUID, UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "service_reviews_reviewer_insert_own" ON public.service_reviews;
CREATE POLICY "service_reviews_reviewer_insert_own" ON public.service_reviews
    FOR INSERT WITH CHECK (
        reviewer_user_id = auth.uid()
        AND public.is_customer_account()
        AND status = 'pending'
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
        AND package_id IS NOT NULL
        AND public.review_package_is_public(photographer_id, service_id, package_id)
    );
