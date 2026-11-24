-- Phase 3: authentication & role hardening (additive; no tables created or dropped)
--
-- Findings fixed here:
--  1. is_admin() trusted raw_user_meta_data, which every user can edit via auth.updateUser()
--     => any user could make themselves admin. Roles now live ONLY in raw_app_meta_data
--     (writable by service role / GoTrue admin API only).
--  2. photographers_owner_update_own has no column restriction => a photographer could set
--     status='approved' or change user_id. Guard trigger added.
--  3. No INSERT policy existed for photographers => profile creation could not respect RLS.
--     Owner may insert only a pending row for themselves, and only with the photographer role.
--  4. Default role assignment at signup (customer / photographer) happens in a trigger so the
--     client can never choose 'admin'.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_app_meta_data->>'role' = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_photographer_account()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_app_meta_data->>'role' = 'photographer'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_photographer_account() TO authenticated, service_role;

-- 3. owner can create only their own pending profile
CREATE POLICY "photographers_owner_insert_pending" ON public.photographers
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND status = 'pending'
        AND public.is_photographer_account()
    );

-- 2. non-admins cannot change approval status or ownership
CREATE OR REPLACE FUNCTION public.guard_photographer_privileged_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
        IF NEW.status IS DISTINCT FROM OLD.status OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'Only admins can change photographer status or ownership'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER guard_photographer_privileged_columns_trigger
    BEFORE UPDATE ON public.photographers
    FOR EACH ROW EXECUTE FUNCTION public.guard_photographer_privileged_columns();

-- 4. default role at signup. Respects a role already set via the admin API (admin provisioning).
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(NEW.raw_app_meta_data->>'role', '') NOT IN ('admin', 'photographer', 'customer') THEN
        NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
            'role',
            CASE WHEN NEW.raw_user_meta_data->>'signup_role' = 'photographer' THEN 'photographer' ELSE 'customer' END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER assign_default_role_trigger
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();
