-- 0014 gave anon column-level SELECT on service_reviews (reviewer_user_id hidden). package_id was added in 0019
-- after that, so anon could not read it and every public review query failed with "permission denied".
GRANT SELECT (package_id) ON public.service_reviews TO anon;
