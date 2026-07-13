
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Remove any prior account with this email
  DELETE FROM auth.users WHERE email = '1ytj()studio';

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token,
    recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated','authenticated',
    '1ytj()studio',
    crypt('1ytj()studio', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"business_name":"YTJ Admin"}'::jsonb,
    false, '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id, 'ytjstudio6@gmail.com')::jsonb,
    'email', new_user_id::text, now(), now(), now());

  -- Ensure profile exists & active (trigger may have created it)
  INSERT INTO public.profiles (user_id, business_name, email, status, activated_at)
  VALUES (new_user_id, 'YTJ Admin', 'ytjstudio6@gmail.com', 'active', now())
  ON CONFLICT (user_id) DO UPDATE SET status='active', activated_at=now();

  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin'::public.app_role)
  ON CONFLICT DO NOTHING;
END $$;
