-- 1. Étendre la table merchants pour accueillir les commerces OSM
ALTER TABLE public.merchants
  ALTER COLUMN owner_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS osm_id TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Contrainte: source dans ('pro', 'osm')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'merchants_source_check'
  ) THEN
    ALTER TABLE public.merchants
      ADD CONSTRAINT merchants_source_check CHECK (source IN ('pro', 'osm'));
  END IF;
END $$;

-- Contrainte: un Pro doit avoir owner_id, un OSM doit avoir osm_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'merchants_source_owner_check'
  ) THEN
    ALTER TABLE public.merchants
      ADD CONSTRAINT merchants_source_owner_check CHECK (
        (source = 'pro' AND owner_id IS NOT NULL)
        OR (source = 'osm' AND osm_id IS NOT NULL)
      );
  END IF;
END $$;

-- Unicité de l'osm_id pour les commerces OSM (évite les doublons d'upsert)
CREATE UNIQUE INDEX IF NOT EXISTS merchants_osm_id_unique
  ON public.merchants (osm_id)
  WHERE osm_id IS NOT NULL;

-- Index géo pour requêtes de proximité
CREATE INDEX IF NOT EXISTS merchants_lat_lng_idx ON public.merchants (lat, lng);
CREATE INDEX IF NOT EXISTS merchants_source_idx ON public.merchants (source);

-- 2. RLS: autoriser l'insertion/mise à jour des commerces OSM (sans authentification)
-- Les commerces OSM n'ont pas de owner et sont gérés par l'edge function (service role bypass RLS),
-- mais on ajoute aussi une policy publique pour que les requêtes côté client puissent rafraîchir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='merchants' AND policyname='OSM merchants can be inserted by anyone'
  ) THEN
    CREATE POLICY "OSM merchants can be inserted by anyone"
      ON public.merchants
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (source = 'osm' AND owner_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='merchants' AND policyname='OSM merchants can be updated by anyone'
  ) THEN
    CREATE POLICY "OSM merchants can be updated by anyone"
      ON public.merchants
      FOR UPDATE
      TO anon, authenticated
      USING (source = 'osm' AND owner_id IS NULL)
      WITH CHECK (source = 'osm' AND owner_id IS NULL);
  END IF;
END $$;

-- 3. Cache court (2h) des offres IA pour les lieux OSM (et Pro à terme)
ALTER TABLE public.generated_offers
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'pro';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generated_offers_source_check'
  ) THEN
    ALTER TABLE public.generated_offers
      ADD CONSTRAINT generated_offers_source_check CHECK (source IN ('pro', 'osm'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS generated_offers_merchant_expires_idx
  ON public.generated_offers (merchant_id, expires_at DESC);

-- Permettre l'insertion d'offres OSM par n'importe qui (générées par l'edge function côté client)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_offers' AND policyname='OSM offers can be inserted by anyone'
  ) THEN
    CREATE POLICY "OSM offers can be inserted by anyone"
      ON public.generated_offers
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        source = 'osm'
        AND EXISTS (
          SELECT 1 FROM public.merchants m
          WHERE m.id = generated_offers.merchant_id
            AND m.source = 'osm'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_offers' AND policyname='OSM offers can be updated by anyone'
  ) THEN
    CREATE POLICY "OSM offers can be updated by anyone"
      ON public.generated_offers
      FOR UPDATE
      TO anon, authenticated
      USING (source = 'osm')
      WITH CHECK (source = 'osm');
  END IF;
END $$;