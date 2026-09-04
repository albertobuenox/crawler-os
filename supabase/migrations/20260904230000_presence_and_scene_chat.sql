-- Emoción de avatar persistida + chat de escena con canales.

ALTER TABLE crawlers
  ADD COLUMN IF NOT EXISTS avatar_emotion TEXT;

ALTER TABLE crawlers
  DROP CONSTRAINT IF EXISTS crawlers_avatar_emotion_check;

ALTER TABLE crawlers
  ADD CONSTRAINT crawlers_avatar_emotion_check
  CHECK (
    avatar_emotion IS NULL
    OR avatar_emotion IN ('alegria', 'asco', 'ira', 'miedo', 'pensativo', 'tristeza')
  );

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role user_role NOT NULL DEFAULT 'crawler',
  author_crawler_id UUID REFERENCES crawlers(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'all',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_body_len CHECK (char_length(btrim(body)) > 0 AND char_length(body) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages (session_id, created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_messages_select ON chat_messages;
CREATE POLICY chat_messages_select ON chat_messages FOR SELECT
  USING (is_session_member(session_id));

DROP POLICY IF EXISTS chat_messages_insert ON chat_messages;
CREATE POLICY chat_messages_insert ON chat_messages FOR INSERT
  WITH CHECK (
    is_session_member(session_id)
    AND author_user_id = auth.uid()
    AND (
      channel = 'all'
      OR EXISTS (
        SELECT 1 FROM crawlers c
        WHERE c.id::text = channel
          AND c.session_id = session_id
      )
    )
  );

DROP POLICY IF EXISTS chat_messages_dm_delete ON chat_messages;
CREATE POLICY chat_messages_dm_delete ON chat_messages FOR DELETE
  USING (is_session_dm(session_id));

GRANT SELECT, INSERT, DELETE ON chat_messages TO authenticated;
GRANT ALL ON chat_messages TO service_role;

ALTER TABLE chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
