-- Descripción, tipo (Ataque / Defensa / Apoyo / Destreza) y miniatura del catálogo.
-- Skills custom (creadas por el DM) no ocupan d100: roll 0–0.
-- Pega este archivo en el SQL Editor de Supabase si no usas `supabase db push`.

ALTER TABLE skill_catalog
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'apoyo',
  ADD COLUMN IF NOT EXISTS thumb_url TEXT;

ALTER TABLE skill_catalog DROP CONSTRAINT IF EXISTS skill_catalog_kind_check;
ALTER TABLE skill_catalog
  ADD CONSTRAINT skill_catalog_kind_check
  CHECK (kind IN ('ataque', 'defensa', 'apoyo', 'destreza'));

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'skill_catalog'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%roll_min%'
  LOOP
    EXECUTE format('ALTER TABLE skill_catalog DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

ALTER TABLE skill_catalog DROP CONSTRAINT IF EXISTS skill_catalog_roll_range;
ALTER TABLE skill_catalog
  ADD CONSTRAINT skill_catalog_roll_range
  CHECK (
    roll_min BETWEEN 0 AND 100
    AND roll_max BETWEEN 0 AND 100
    AND roll_max >= roll_min
  );

UPDATE skill_catalog SET kind = 'ataque'
WHERE slug IN (
  'aiming', 'ambush', 'axe', 'back-claw', 'bite', 'bow', 'club', 'crossbow', 'dagger',
  'explosives-handling', 'foot-soldier', 'goblin-explosives', 'handgun',
  'incendiary-device-handling', 'improvised-weapons', 'javelin', 'longsword',
  'noggin-nocker', 'polearm', 'pugilism', 'quarterstaff', 'shotgun', 'shuriken',
  'slice-attack', 'slingshot', 'throwing', 'unarmed-combat', 'warhammer', 'wrasslin',
  'choke-out', 'dirty-fighting', 'herding-weapons', 'iron-punch', 'lance',
  'powerful-strike', 'rapier', 'skullcracker', 'smush', 'toss'
);

UPDATE skill_catalog SET kind = 'defensa'
WHERE slug IN ('dodge', 'endurance');

UPDATE skill_catalog SET kind = 'destreza'
WHERE slug IN (
  'catcher', 'chopper-pilot', 'climbing', 'detect-trap', 'driving', 'escape-artist',
  'hide-in-shadows', 'jumping', 'light-on-your-feet', 'lockpicking', 'running',
  'sleight-of-hand', 'stealth', 'swimming'
);

UPDATE skill_catalog SET kind = 'apoyo'
WHERE slug IN (
  'animal-handling', 'deception', 'detect-lies', 'determine-value', 'dumpster-diving',
  'engineering', 'fabricate', 'find-crawler', 'first-aid', 'good-first-impression',
  'intimidate', 'investigation', 'negotiation', 'perception', 'performance',
  'persuasion', 'regeneration', 'repair', 'salvage', 'streetwise', 'survival',
  'tactics', 'taunt', 'tracking'
);

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'skill-thumbs',
    'skill-thumbs',
    true,
    2097152,
    ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/gif']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS skill_thumbs_public_read ON storage.objects;
  CREATE POLICY skill_thumbs_public_read ON storage.objects
    FOR SELECT
    USING (bucket_id = 'skill-thumbs');

  DROP POLICY IF EXISTS skill_thumbs_dm_write ON storage.objects;
  CREATE POLICY skill_thumbs_dm_write ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'skill-thumbs' AND public.is_dm())
    WITH CHECK (bucket_id = 'skill-thumbs' AND public.is_dm());
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Storage skill-thumbs no configurado: %', SQLERRM;
END $$;
