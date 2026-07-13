
-- Delete all customer data and accounts
DELETE FROM public.sale_items;
DELETE FROM public.sales;
DELETE FROM public.items;
DELETE FROM public.payment_receipts;
DELETE FROM public.activation_codes;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- Update signup handler to auto-assign admin role to ytjstudio6@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, business_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'business_name', 'My Business'),
    NEW.email
  );

  IF NEW.email = 'ytjstudio6@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
