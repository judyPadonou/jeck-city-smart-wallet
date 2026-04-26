-- Allow the user who accepted an offer to mark it as expired
CREATE POLICY "Clients can expire their accepted offers"
ON public.generated_offers
FOR UPDATE
TO authenticated
USING (accepted_by = auth.uid() AND status = 'confirmed'::offer_status)
WITH CHECK (accepted_by = auth.uid() AND status = 'expired'::offer_status);