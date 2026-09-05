-- Rareza y piso solo para cajas de loot; origen y unicidad en el equipo.

CREATE TYPE loot_box_rarity AS ENUM (
  'bronze',
  'silver',
  'gold',
  'platinum',
  'legendary',
  'celestial'
);

ALTER TABLE resources
  ADD COLUMN loot_rarity loot_box_rarity,
  ADD COLUMN loot_floor INT CHECK (loot_floor IS NULL OR loot_floor >= 1),
  ADD COLUMN is_unique BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN source_loot_rarity loot_box_rarity,
  ADD COLUMN source_loot_floor INT CHECK (source_loot_floor IS NULL OR source_loot_floor >= 1);

ALTER TABLE loot_boxes
  ADD COLUMN loot_rarity loot_box_rarity,
  ADD COLUMN loot_floor INT CHECK (loot_floor IS NULL OR loot_floor >= 1);

ALTER TABLE item_instances
  ADD COLUMN source_loot_rarity loot_box_rarity,
  ADD COLUMN source_loot_floor INT CHECK (source_loot_floor IS NULL OR source_loot_floor >= 1);

COMMENT ON COLUMN resources.loot_rarity IS 'Solo cajas (kind=box). Bronce a Celestial.';
COMMENT ON COLUMN resources.loot_floor IS 'Piso de la caja de loot.';
COMMENT ON COLUMN resources.is_unique IS 'Equipo único. Estrella en miniatura.';
COMMENT ON COLUMN resources.source_loot_rarity IS 'Rareza de la caja de la que salió este equipo.';
COMMENT ON COLUMN resources.source_loot_floor IS 'Piso de la caja de la que salió este equipo.';

UPDATE resources
SET
  loot_rarity = CASE rarity
    WHEN 'legendary' THEN 'legendary'::loot_box_rarity
    WHEN 'celestial' THEN 'celestial'::loot_box_rarity
    ELSE 'bronze'::loot_box_rarity
  END,
  loot_floor = 1
WHERE kind = 'box';

UPDATE loot_boxes lb
SET
  loot_rarity = r.loot_rarity,
  loot_floor = r.loot_floor
FROM resources r
WHERE r.id = lb.resource_id;

CREATE OR REPLACE FUNCTION grant_resource(
  p_resource_id UUID,
  p_crawler_ids UUID[],
  p_mode TEXT DEFAULT 'reward',
  p_system_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  r resources%ROWTYPE;
  cid UUID;
  v_event_id UUID;
  v_user UUID := auth.uid();
  v_contents JSONB;
BEGIN
  SELECT * INTO r FROM resources WHERE id = p_resource_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resource not found'; END IF;

  v_contents := CASE
    WHEN jsonb_typeof(r.payload -> 'contents') = 'array' THEN r.payload -> 'contents'
    ELSE '[]'::jsonb
  END;

  FOREACH cid IN ARRAY p_crawler_ids LOOP
    IF r.kind = 'item' THEN
      INSERT INTO item_instances (
        crawler_id, resource_id, quantity, source_loot_rarity, source_loot_floor
      )
      VALUES (cid, p_resource_id, 1, r.source_loot_rarity, r.source_loot_floor);
    END IF;

    IF r.kind = 'box' THEN
      INSERT INTO item_instances (crawler_id, resource_id, quantity)
      VALUES (cid, p_resource_id, 1);
      INSERT INTO loot_boxes (
        session_id, resource_id, assigned_crawler_id, contents, loot_rarity, loot_floor
      )
      VALUES (
        r.session_id, r.id, cid, v_contents, r.loot_rarity, COALESCE(r.loot_floor, 1)
      );
    END IF;

    IF r.kind = 'achievement' THEN
      INSERT INTO achievements_unlocked (session_id, crawler_id, resource_id)
      VALUES (r.session_id, cid, p_resource_id);
    END IF;

    INSERT INTO event_log (session_id, event_type, actor_id, target_crawler_id, message, payload)
    VALUES (
      r.session_id,
      CASE p_mode WHEN 'penalty' THEN 'PENALTY'::event_type ELSE 'REWARD'::event_type END,
      v_user, cid,
      COALESCE(p_system_message, 'BORANT CORP has granted: ' || r.name),
      jsonb_build_object(
        'resource_id', p_resource_id,
        'mode', p_mode,
        'loot_rarity', r.loot_rarity,
        'loot_floor', r.loot_floor,
        'source_loot_rarity', r.source_loot_rarity,
        'source_loot_floor', r.source_loot_floor,
        'is_unique', r.is_unique
      )
    )
    RETURNING id INTO v_event_id;

    INSERT INTO notifications (session_id, user_id, notification_type, title, body, event_id, payload)
    SELECT r.session_id, sm.user_id,
      CASE p_mode WHEN 'penalty' THEN 'penalty'::notification_type ELSE 'reward'::notification_type END,
      CASE p_mode WHEN 'penalty' THEN 'PENALTY' ELSE 'REWARD' END,
      COALESCE(p_system_message, r.name),
      v_event_id,
      jsonb_build_object(
        'resource_id', p_resource_id,
        'resource_name', r.name,
        'rarity', r.rarity,
        'loot_rarity', r.loot_rarity,
        'loot_floor', r.loot_floor,
        'source_loot_rarity', r.source_loot_rarity,
        'source_loot_floor', r.source_loot_floor,
        'is_unique', r.is_unique
      )
    FROM session_members sm
    WHERE sm.crawler_id = cid OR sm.user_id IN (
      SELECT owner_user_id FROM crawlers WHERE id = cid
    );
  END LOOP;

  RETURN jsonb_build_object('granted', array_length(p_crawler_ids, 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
