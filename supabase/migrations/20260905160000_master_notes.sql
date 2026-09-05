-- Notas del Master: borradores de notificación, notas, checklists y mobs.

CREATE TABLE IF NOT EXISTS dm_notification_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  is_reminder BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dm_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dm_mobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INT NOT NULL DEFAULT 1,
  mob_type TEXT NOT NULL DEFAULT 'beast',
  sprite_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dm_mobs_level_range CHECK (level >= 1 AND level <= 99)
);

CREATE INDEX IF NOT EXISTS dm_notification_drafts_session_idx ON dm_notification_drafts (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_notes_session_idx ON dm_notes (session_id, is_reminder, updated_at DESC);
CREATE INDEX IF NOT EXISTS dm_checklists_session_idx ON dm_checklists (session_id, is_pinned, updated_at DESC);
CREATE INDEX IF NOT EXISTS dm_mobs_session_idx ON dm_mobs (session_id, name);

ALTER TABLE dm_notification_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_mobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_notification_drafts_dm ON dm_notification_drafts;
CREATE POLICY dm_notification_drafts_dm ON dm_notification_drafts
  FOR ALL USING (is_session_dm(session_id)) WITH CHECK (is_session_dm(session_id));

DROP POLICY IF EXISTS dm_notes_dm ON dm_notes;
CREATE POLICY dm_notes_dm ON dm_notes
  FOR ALL USING (is_session_dm(session_id)) WITH CHECK (is_session_dm(session_id));

DROP POLICY IF EXISTS dm_checklists_dm ON dm_checklists;
CREATE POLICY dm_checklists_dm ON dm_checklists
  FOR ALL USING (is_session_dm(session_id)) WITH CHECK (is_session_dm(session_id));

DROP POLICY IF EXISTS dm_mobs_dm ON dm_mobs;
CREATE POLICY dm_mobs_dm ON dm_mobs
  FOR ALL USING (is_session_dm(session_id)) WITH CHECK (is_session_dm(session_id));

DROP POLICY IF EXISTS dm_mobs_select ON dm_mobs;
CREATE POLICY dm_mobs_select ON dm_mobs
  FOR SELECT USING (is_session_member(session_id) OR EXISTS (
    SELECT 1 FROM sessions s WHERE s.id = session_id AND s.is_active
  ));

ALTER TABLE dm_notification_drafts REPLICA IDENTITY FULL;
ALTER TABLE dm_notes REPLICA IDENTITY FULL;
ALTER TABLE dm_checklists REPLICA IDENTITY FULL;
ALTER TABLE dm_mobs REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dm_notification_drafts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dm_notes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dm_checklists;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dm_mobs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION send_master_notifications(
  p_session_id UUID,
  p_notification_type notification_type,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_target_user_id UUID DEFAULT NULL,
  p_copies INT DEFAULT 1
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copies INT := GREATEST(1, LEAST(COALESCE(p_copies, 1), 20));
  v_title TEXT := NULLIF(BTRIM(COALESCE(p_title, '')), '');
  v_body TEXT := NULLIF(BTRIM(COALESCE(p_body, '')), '');
  v_event_type event_type;
  v_count INT := 0;
  v_user UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT is_session_dm(p_session_id) THEN
    RAISE EXCEPTION 'Solo el Dungeon Master';
  END IF;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Falta el título';
  END IF;

  v_event_type := CASE p_notification_type
    WHEN 'reward' THEN 'REWARD'::event_type
    WHEN 'penalty' THEN 'PENALTY'::event_type
    WHEN 'combat' THEN 'COMBAT'::event_type
    WHEN 'roll' THEN 'ROLL'::event_type
    WHEN 'achievement' THEN 'ACHIEVEMENT'::event_type
    ELSE 'SYSTEM'::event_type
  END;

  IF p_target_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM session_members
      WHERE session_id = p_session_id AND user_id = p_target_user_id
    ) THEN
      RAISE EXCEPTION 'Ese crawler no está en la sesión';
    END IF;
  END IF;

  INSERT INTO event_log (session_id, event_type, actor_id, message, payload)
  VALUES (
    p_session_id,
    v_event_type,
    auth.uid(),
    v_title || CASE WHEN v_body IS NULL THEN '' ELSE ' — ' || v_body END,
    jsonb_build_object(
      'source', 'master_notes',
      'copies', v_copies,
      'target_user_id', p_target_user_id
    )
  );

  FOR v_user IN
    SELECT DISTINCT sm.user_id
    FROM session_members sm
    JOIN profiles p ON p.id = sm.user_id
    WHERE sm.session_id = p_session_id
      AND p.role = 'crawler'
      AND (p_target_user_id IS NULL OR sm.user_id = p_target_user_id)
  LOOP
    FOR i IN 1..v_copies LOOP
      INSERT INTO notifications (
        session_id, user_id, notification_type, title, body, payload
      ) VALUES (
        p_session_id,
        v_user,
        p_notification_type,
        v_title,
        v_body,
        jsonb_build_object('source', 'master_notes', 'copy_index', i)
      );
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No hay jugadores conectados para recibir esto';
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION send_master_notifications(UUID, notification_type, TEXT, TEXT, UUID, INT) TO authenticated;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']
WHERE id = 'scene-assets';

NOTIFY pgrst, 'reload schema';
