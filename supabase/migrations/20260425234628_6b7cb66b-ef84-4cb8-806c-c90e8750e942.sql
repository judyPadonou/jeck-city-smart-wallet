-- Add qr_code + accepted_by + accepted_at columns to generated_offers
ALTER TABLE public.generated_offers
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS accepted_by UUID,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Allow authenticated users (clients) to confirm an active offer for themselves.
DROP POLICY IF EXISTS "Clients can confirm active offers" ON public.generated_offers;
CREATE POLICY "Clients can confirm active offers"
ON public.generated_offers
FOR UPDATE
TO authenticated
USING (status = 'active')
WITH CHECK (status = 'confirmed' AND accepted_by = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_merchants_lat_lng ON public.merchants (lat, lng);
CREATE INDEX IF NOT EXISTS idx_offers_accepted_by ON public.generated_offers (accepted_by);