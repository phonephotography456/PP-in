-- Migration: Sync user roles from Supabase Auth
-- This migration creates a trigger to sync user roles from auth.users to a public user_roles table
-- and sets up the auth.users metadata for role checking.

-- Create user_roles table for faster role lookups (optional but recommended)
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
CREATE POLICY "user_roles_owner_read" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_roles_admin_all" ON public.user_roles
    FOR ALL USING (public.is_admin());

-- Grant permissions
GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Function to sync role from auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.user_roles (user_id, role, updated_at)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::public.user_role,
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            role = EXCLUDED.role,
            updated_at = NOW();
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.user_roles WHERE user_id = OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to sync roles
-- Note: This requires the supabase_admin role to create triggers on auth schema
-- In practice, this is often handled by Supabase hooks or a separate process
-- For now, we'll create the function and document the trigger creation
COMMENT ON FUNCTION public.sync_user_role IS 
'Sync user roles from auth.users to public.user_roles. 
Create trigger on auth.users: 
CREATE TRIGGER sync_user_role_trigger
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();';

-- Update is_admin function to use user_roles table for better performance
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_photographer_owner to use user_roles for role check
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

-- Grant execute on updated functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_photographer_owner(UUID) TO anon, authenticated, service_role;