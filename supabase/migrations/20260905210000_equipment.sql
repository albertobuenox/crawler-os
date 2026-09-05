-- Slot de equipo en el catálogo + RPC para equipar / desequipar (únicos se destruyen).

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS equip_slot TEXT;

ALTER TABLE resources
  DROP CONSTRAINT IF EXISTS resources_equip_slot_check;

ALTER TABLE resources
  ADD CONSTRAINT resources_equip_slot_check
  CHECK (
    equip_slot IS NULL OR equip_slot IN (
      'head', 'cloak', 'chest', 'gloves', 'boots',
      'hand_right', 'hand_left', 'accessory'
    )
  );

COMMENT ON COLUMN resources.equip_slot IS 'Parte del cuerpo donde se equipa. Solo kind=item.';

CREATE OR REPLACE FUNCTION set_item_equipped(
  p_item_id UUID,
  p_slot TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item item_instances%ROWTYPE;
  v_resource resources%ROWTYPE;
  v_crawler crawlers%ROWTYPE;
  v_occupant item_instances%ROWTYPE;
  v_occupant_res resources%ROWTYPE;
  v_user UUID := auth.uid();
  v_expected TEXT;
  v_destroyed UUID[] := '{}';
BEGIN
  SELECT * INTO v_item FROM item_instances WHERE id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;

  SELECT * INTO v_crawler FROM crawlers WHERE id = v_item.crawler_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Crawler not found'; END IF;

  IF NOT (
    v_crawler.owner_user_id = v_user
    OR is_session_dm(v_crawler.session_id)
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT * INTO v_resource FROM resources WHERE id = v_item.resource_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resource not found'; END IF;

  v_expected := COALESCE(v_resource.equip_slot, v_resource.payload->>'equip_slot');

  IF p_slot IS NULL THEN
    IF v_resource.is_unique THEN
      DELETE FROM item_instances WHERE id = v_item.id;
      RETURN jsonb_build_object('ok', true, 'destroyed', ARRAY[v_item.id], 'equipped_slot', NULL);
    END IF;
    UPDATE item_instances SET equipped_slot = NULL WHERE id = v_item.id;
    RETURN jsonb_build_object('ok', true, 'destroyed', v_destroyed, 'equipped_slot', NULL);
  END IF;

  IF v_expected IS NULL OR v_expected = '' THEN
    RAISE EXCEPTION 'This item cannot be equipped';
  END IF;

  IF v_expected = 'accessory' THEN
    IF p_slot NOT IN ('accessory_1', 'accessory_2', 'accessory_3') THEN
      RAISE EXCEPTION 'Wrong slot';
    END IF;
  ELSIF v_expected IS DISTINCT FROM p_slot THEN
    RAISE EXCEPTION 'Wrong slot';
  END IF;

  SELECT * INTO v_occupant
  FROM item_instances
  WHERE crawler_id = v_item.crawler_id
    AND equipped_slot = p_slot
    AND id <> v_item.id
  LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_occupant_res FROM resources WHERE id = v_occupant.resource_id;
    IF v_occupant_res.is_unique THEN
      DELETE FROM item_instances WHERE id = v_occupant.id;
      v_destroyed := array_append(v_destroyed, v_occupant.id);
    ELSE
      UPDATE item_instances SET equipped_slot = NULL WHERE id = v_occupant.id;
    END IF;
  END IF;

  UPDATE item_instances SET equipped_slot = p_slot WHERE id = v_item.id;
  RETURN jsonb_build_object('ok', true, 'destroyed', v_destroyed, 'equipped_slot', p_slot);
END;
$$;

GRANT EXECUTE ON FUNCTION set_item_equipped(UUID, TEXT) TO authenticated;
