-- Allow deletion of profiles (for admin portal)
CREATE POLICY "Anyone can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (true);