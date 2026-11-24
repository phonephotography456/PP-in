-- Phase 9: security hardening (no tables created; no existing policies changed).
--
-- 1. CRITICAL: leftover debug helpers public.test_* were callable by `anon` through PostgREST RPC. They call
--    set_config('request.jwt.claims', <any user id>), so anyone with the public anon key could act as an admin
--    (confirmed locally: rpc/test_insert_service created a services row as the admin). Dropped.
-- 2. sync_user_role: dead SECURITY DEFINER function (no trigger uses it, user_roles table no longer exists). Dropped.
-- 3. SECURITY DEFINER functions without a pinned search_path (is_photographer_owner, cascade_photographer_deletion)
--    now pin it; bodies already schema-qualify every object.
-- 4. Supabase default grants gave anon/authenticated TRUNCATE, TRIGGER and REFERENCES on every table. RLS does not
--    cover TRUNCATE, so revoke them; also stop future tables inheriting them.
-- 5. Anonymous readers no longer get the auth user ids (photographers.user_id, service_reviews.reviewer_user_id).
--    No public page reads them; they were the identifiers the helpers in (1) needed.

DROP FUNCTION IF EXISTS public.test_delete_photographer(uuid, uuid);
DROP FUNCTION IF EXISTS public.test_delete_service(uuid, uuid);
DROP FUNCTION IF EXISTS public.test_insert_service(uuid, text, text);
DROP FUNCTION IF EXISTS public.test_is_admin(uuid);
DROP FUNCTION IF EXISTS public.test_select_models(uuid);
DROP FUNCTION IF EXISTS public.test_update_service(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.sync_user_role();

ALTER FUNCTION public.is_photographer_owner(uuid) SET search_path = '';
ALTER FUNCTION public.cascade_photographer_deletion() SET search_path = '';

REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM anon, authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES ('photographers', 'user_id'), ('service_reviews', 'reviewer_user_id')) AS t(tbl, hidden) LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', r.tbl);
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO anon',
      (SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = r.tbl AND column_name <> r.hidden),
      r.tbl);
  END LOOP;
END $$;
