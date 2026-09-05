-- Minimapa táctico de sesión: fichas, trazos y obstáculos.
-- El Master escribe; crawlers y Mesa TV solo leen.

CREATE TABLE IF NOT EXISTS minimap_state (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  tokens JSONB NOT NULL DEFAULT '[]'::jsonb,
  strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
  fixtures JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO minimap_state (session_id)
SELECT id FROM sessions
ON CONFLICT (session_id) DO NOTHING;

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

  LOOP
    v_code := generate_session_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM sessions WHERE code = v_code);
  END LOOP;

  INSERT INTO sessions (code, name, created_by)
  VALUES (v_code, p_name, v_user_id)
  RETURNING id INTO v_session_id;

  INSERT INTO session_members (session_id, user_id) VALUES (v_session_id, v_user_id);
  INSERT INTO table_state (session_id) VALUES (v_session_id);
  INSERT INTO minimap_state (session_id) VALUES (v_session_id);

  RETURN jsonb_build_object('session_id', v_session_id, 'code', v_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE minimap_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS minimap_state_select ON minimap_state;
CREATE POLICY minimap_state_select ON minimap_state FOR SELECT
  USING (is_session_member(session_id));

DROP POLICY IF EXISTS minimap_state_dm ON minimap_state;
CREATE POLICY minimap_state_dm ON minimap_state FOR ALL
  USING (is_session_dm(session_id))
  WITH CHECK (is_session_dm(session_id));

DROP POLICY IF EXISTS minimap_state_public ON minimap_state;
CREATE POLICY minimap_state_public ON minimap_state FOR SELECT
  USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.is_active));

GRANT SELECT ON minimap_state TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON minimap_state TO authenticated;
GRANT ALL ON minimap_state TO service_role;

ALTER TABLE minimap_state REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE minimap_state;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
