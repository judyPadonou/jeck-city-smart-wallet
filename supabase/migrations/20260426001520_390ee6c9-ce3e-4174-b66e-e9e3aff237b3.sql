CREATE POLICY "Clients can view their accepted offers"
ON public.generated_offers
FOR SELECT
TO authenticated
USING (accepted_by = auth.uid());