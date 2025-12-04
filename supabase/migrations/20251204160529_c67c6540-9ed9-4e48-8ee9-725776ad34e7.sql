-- Allow public read access to profiles for admin portal
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Anyone can view profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Allow anyone to insert activation codes (for admin)
CREATE POLICY "Anyone can insert activation codes" 
ON public.activation_codes 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to view all receipts (for admin)
DROP POLICY IF EXISTS "Users can view their own receipts" ON public.payment_receipts;
CREATE POLICY "Anyone can view receipts" 
ON public.payment_receipts 
FOR SELECT 
USING (true);