-- Phase 7: service reviews.
--
-- Fixes / additions:
--  1. review_text becomes optional (title and description are both optional; rating is the only required field).
--  2. reviewer_name snapshot, filled by trigger from the account's full_name. Public readers cannot read auth.users,
--     so the name shown beside an approved review has to live on the row. No email is stored on the row.
--  3. The old INSERT policy only checked reviewer_user_id = auth.uid(), so any signed-in user (even a photographer)
--     could insert an already-'approved' review for any photographer/service. Replaced: customer role only, status must
--     be 'pending', no moderation fields, photographer approved, and the service must have a published package.
--  4. One live review per customer per photographer+service (rejected ones don't block a resubmission).
--  5. Text length limits enforced by the DB, not just the app.
--  6. Admin-only lookup of reviewer emails for the moderation list.
-- Additive except the NOT NULL relaxation in (1). Existing policies for read-own, public-approved and admin stay as is.

ALTER TABLE public.service_reviews ALTER COLUMN review_text DROP NOT NULL;
ALTER TABLE public.service_reviews ADD COLUMN IF NOT EXISTS reviewer_name varchar(150);

ALTER TABLE public.service_reviews
    ADD CONSTRAINT service_reviews_text_len CHECK (review_text IS NULL OR char_length(review_text) <= 2000);

CREATE UNIQUE INDEX service_reviews_one_live_per_reviewer
    ON public.service_reviews (reviewer_user_id, photographer_id, service_id)
    WHERE status <> 'rejected';

-- Role check, same pattern as is_admin() / is_photographer_account().
CREATE OR REPLACE FUNCTION public.is_customer_account()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_app_meta_data->>'role' = 'customer'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
GRANT EXECUTE ON FUNCTION public.is_customer_account() TO authenticated, service_role;

-- A review can only target an approved photographer that currently has a published package for that service.
CREATE OR REPLACE FUNCTION public.review_target_is_public(p_photographer UUID, p_service UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.photographers ph
        JOIN public.packages pk ON pk.photographer_id = ph.id
        WHERE ph.id = p_photographer AND ph.status = 'approved'
          AND pk.service_id = p_service AND pk.status = 'published'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
GRANT EXECUTE ON FUNCTION public.review_target_is_public(UUID, UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "service_reviews_reviewer_insert_own" ON public.service_reviews;
CREATE POLICY "service_reviews_reviewer_insert_own" ON public.service_reviews
    FOR INSERT WITH CHECK (
        reviewer_user_id = auth.uid()
        AND public.is_customer_account()
        AND status = 'pending'
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
        AND public.review_target_is_public(photographer_id, service_id)
    );

-- Server-controlled columns on insert: submission time and the display-name snapshot.
CREATE OR REPLACE FUNCTION public.service_reviews_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    NEW.submitted_at := NOW();
    NEW.title := NULLIF(btrim(NEW.title), '');
    NEW.review_text := NULLIF(btrim(NEW.review_text), '');
    SELECT COALESCE(NULLIF(btrim(u.raw_user_meta_data->>'full_name'), ''), 'Customer')
      INTO NEW.reviewer_name
      FROM auth.users u WHERE u.id = NEW.reviewer_user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER service_reviews_before_insert_trigger
    BEFORE INSERT ON public.service_reviews
    FOR EACH ROW EXECUTE FUNCTION public.service_reviews_before_insert();

-- Admin-only: reviewer emails for the moderation list (auth.users is not readable by `authenticated`).
CREATE OR REPLACE FUNCTION public.admin_reviewer_emails(p_ids UUID[])
RETURNS TABLE (id UUID, email TEXT) AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY SELECT u.id, u.email::text FROM auth.users u WHERE u.id = ANY (p_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE ALL ON FUNCTION public.admin_reviewer_emails(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reviewer_emails(UUID[]) TO authenticated, service_role;
