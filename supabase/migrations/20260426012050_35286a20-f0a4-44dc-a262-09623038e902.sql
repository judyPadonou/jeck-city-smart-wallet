-- Table simulant le flux de transactions Payone par commerce sur 24h
CREATE TABLE public.payone_transaction_flow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  hour_slot SMALLINT NOT NULL CHECK (hour_slot >= 0 AND hour_slot <= 23),
  transaction_count INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  avg_basket NUMERIC NOT NULL DEFAULT 0,
  is_off_peak BOOLEAN NOT NULL DEFAULT false,
  recorded_for DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, hour_slot, recorded_for)
);

CREATE INDEX idx_payone_flow_merchant_date ON public.payone_transaction_flow (merchant_id, recorded_for);

ALTER TABLE public.payone_transaction_flow ENABLE ROW LEVEL SECURITY;

-- Lecture publique : utilisée par l'IA et l'affichage des suggestions
CREATE POLICY "Payone flow is viewable by everyone"
  ON public.payone_transaction_flow
  FOR SELECT
  USING (true);

-- Les Pros peuvent gérer le flux de leurs propres commerces
CREATE POLICY "Pros can insert flow for their merchants"
  ON public.payone_transaction_flow
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = payone_transaction_flow.merchant_id AND m.owner_id = auth.uid()
  ));

CREATE POLICY "Pros can update flow for their merchants"
  ON public.payone_transaction_flow
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = payone_transaction_flow.merchant_id AND m.owner_id = auth.uid()
  ));

CREATE POLICY "Pros can delete flow for their merchants"
  ON public.payone_transaction_flow
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = payone_transaction_flow.merchant_id AND m.owner_id = auth.uid()
  ));

CREATE TRIGGER trg_payone_flow_updated_at
  BEFORE UPDATE ON public.payone_transaction_flow
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();