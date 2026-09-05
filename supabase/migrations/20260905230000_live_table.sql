-- Mesa en vivo: heartbeat de presencia + sync de inventario/efectos.
-- Un Master, un piso activo.

ALTER TABLE session_members
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

ALTER TABLE item_instances REPLICA IDENTITY FULL;
ALTER TABLE effects REPLICA IDENTITY FULL;
ALTER TABLE resources REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE item_instances;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE effects;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE resources;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION create_game_session(p_name TEXT DEFAULT 'New Floor')
RETURNS JSONB AS $$
DECLARE
  v_code TEXT;
  v_session_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'dm') THEN
    RAISE EXCEPTION 'Only Dungeon Master can create a session';
  END IF;

  UPDATE sessions SET is_active = false
  WHERE created_by = v_user_id AND is_active = true;

  LOOP
    v_code := generate_session_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM sessions WHERE code = v_code);
  END LOOP;

  INSERT INTO sessions (code, name, created_by)
  VALUES (v_code, p_name, v_user_id)
  RETURNING id INTO v_session_id;

  INSERT INTO session_members (session_id, user_id, last_seen_at)
  VALUES (v_session_id, v_user_id, now());
  INSERT INTO table_state (session_id) VALUES (v_session_id);
  INSERT INTO minimap_state (session_id) VALUES (v_session_id);

  RETURN jsonb_build_object('session_id', v_session_id, 'code', v_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
