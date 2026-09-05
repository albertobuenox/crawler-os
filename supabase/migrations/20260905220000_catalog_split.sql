-- Categoría de objeto + reclasificar el catálogo hacia Objetos / PNJ / Mobs.

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS item_category TEXT;

ALTER TABLE resources
  DROP CONSTRAINT IF EXISTS resources_item_category_check;

ALTER TABLE resources
  ADD CONSTRAINT resources_item_category_check
  CHECK (
    item_category IS NULL OR item_category IN ('equipment', 'consumable', 'misc')
  );

COMMENT ON COLUMN resources.item_category IS
  'Subtipo de kind=item: equipo, consumible o misceláneo.';

UPDATE resources
SET item_category = CASE
  WHEN equip_slot IS NOT NULL THEN 'equipment'
  WHEN COALESCE(payload->>'equip_slot', '') IN (
    'head', 'cloak', 'chest', 'gloves', 'boots',
    'hand_right', 'hand_left', 'accessory'
  ) THEN 'equipment'
  ELSE 'misc'
END
WHERE kind = 'item'
  AND item_category IS NULL;

-- Mobs del bestiario (dm_mobs) pasan al catálogo de monstruos si no existían.
INSERT INTO resources (
  session_id,
  kind,
  name,
  rarity,
  description,
  icon_url,
  payload
)
SELECT
  m.session_id,
  'monster',
  m.name,
  'common',
  NULL,
  m.sprite_url,
  jsonb_build_object(
    'level', m.level,
    'mob_type', m.mob_type,
    'dm_mob_id', m.id
  )
FROM dm_mobs m
WHERE NOT EXISTS (
  SELECT 1
  FROM resources r
  WHERE r.session_id = m.session_id
    AND r.kind = 'monster'
    AND lower(r.name) = lower(m.name)
);
