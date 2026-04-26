-- Allow inserting/updating/deleting payone_transaction_flow rows for OSM merchants
-- (anyone, since OSM merchants have no owner). Pros policies remain unchanged.

CREATE POLICY "OSM flow can be inserted by anyone"
ON public.payone_transaction_flow
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = payone_transaction_flow.merchant_id
      AND m.source = 'osm'
  )
);

CREATE POLICY "OSM flow can be updated by anyone"
ON public.payone_transaction_flow
FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = payone_transaction_flow.merchant_id
      AND m.source = 'osm'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = payone_transaction_flow.merchant_id
      AND m.source = 'osm'
  )
);

CREATE POLICY "OSM flow can be deleted by anyone"
ON public.payone_transaction_flow
FOR DELETE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.merchants m
    WHERE m.id = payone_transaction_flow.merchant_id
      AND m.source = 'osm'
  )
);