
-- Payments table
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  whatsapp_number text NOT NULL,
  amount numeric NOT NULL,
  transaction_reference text NOT NULL UNIQUE,
  paystack_reference text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all payments"
  ON public.payments FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed configurable admin settings
INSERT INTO public.admin_settings (setting_key, setting_value) VALUES
  ('activation_amount', '5000'),
  ('paystack_public_key', ''),
  ('paystack_secret_key', '')
ON CONFLICT (setting_key) DO NOTHING;

-- Allow authenticated users to read the activation amount + public key (not secret key)
CREATE OR REPLACE FUNCTION public.get_public_payment_settings()
RETURNS TABLE(activation_amount text, paystack_public_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT setting_value FROM public.admin_settings WHERE setting_key = 'activation_amount'),
    (SELECT setting_value FROM public.admin_settings WHERE setting_key = 'paystack_public_key');
$$;

GRANT EXECUTE ON FUNCTION public.get_public_payment_settings() TO authenticated;
