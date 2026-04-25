-- ============================================
-- MERCHANTS TABLE
-- ============================================
CREATE TABLE public.merchants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon clients) can browse merchants on the map
CREATE POLICY "Merchants are viewable by everyone"
ON public.merchants FOR SELECT
USING (true);

-- Only authenticated pros can create their own merchant entry
CREATE POLICY "Pros can insert their own merchants"
ON public.merchants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'pro'));

CREATE POLICY "Pros can update their own merchants"
ON public.merchants FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'pro'));

CREATE POLICY "Pros can delete their own merchants"
ON public.merchants FOR DELETE
TO authenticated
USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'pro'));

CREATE TRIGGER trg_merchants_updated_at
BEFORE UPDATE ON public.merchants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_merchants_owner ON public.merchants(owner_id);
CREATE INDEX idx_merchants_category ON public.merchants(category);

-- ============================================
-- GENERATED OFFERS TABLE
-- ============================================
CREATE TYPE public.offer_status AS ENUM ('draft', 'active', 'paused', 'expired');

CREATE TABLE public.generated_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  status public.offer_status NOT NULL DEFAULT 'draft',
  context_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_offers ENABLE ROW LEVEL SECURITY;

-- Clients can browse active offers
CREATE POLICY "Active offers are viewable by everyone"
ON public.generated_offers FOR SELECT
USING (status = 'active');

-- Pro owners can see all their offers (any status)
CREATE POLICY "Pros can view their own offers"
ON public.generated_offers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = merchant_id AND m.owner_id = auth.uid()
  )
);

CREATE POLICY "Pros can insert offers for their merchants"
ON public.generated_offers FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'pro') AND EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = merchant_id AND m.owner_id = auth.uid()
  )
);

CREATE POLICY "Pros can update their own offers"
ON public.generated_offers FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = merchant_id AND m.owner_id = auth.uid()
  )
);

CREATE POLICY "Pros can delete their own offers"
ON public.generated_offers FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = merchant_id AND m.owner_id = auth.uid()
  )
);

CREATE TRIGGER trg_generated_offers_updated_at
BEFORE UPDATE ON public.generated_offers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_offers_merchant ON public.generated_offers(merchant_id);
CREATE INDEX idx_offers_status ON public.generated_offers(status);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Only the pro owner of the merchant can read transactions
CREATE POLICY "Pros can view their own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = merchant_id AND m.owner_id = auth.uid()
  )
);

CREATE POLICY "Pros can insert transactions for their merchants"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'pro') AND EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = merchant_id AND m.owner_id = auth.uid()
  )
);

CREATE INDEX idx_transactions_merchant ON public.transactions(merchant_id);
CREATE INDEX idx_transactions_timestamp ON public.transactions("timestamp" DESC);
