-- El Master entra por profiles.role = 'dm' y session_members.
-- is_session_dm() además exige sessions.created_by = auth.uid(), y por eso
-- el INSERT en dm_mobs (y el resto de notas) puede fallar con:
--   new row violates row-level security policy for table "dm_mobs"
-- Pega este archivo en el SQL Editor si no usas supabase db push.

GRANT SELECT, INSERT, UPDATE, DELETE ON
  dm_notification_drafts,
  dm_notes,
  dm_checklists,
  dm_mobs
TO authenticated;

GRANT ALL ON
  dm_notification_drafts,
  dm_notes,
  dm_checklists,
  dm_mobs
TO service_role;

CREATE OR REPLACE FUNCTION public.is_session_master(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_session_dm(p_session_id)
    OR (
      public.is_session_member(p_session_id)
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'dm'
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_session_master(UUID) TO authenticated;

DROP POLICY IF EXISTS dm_notification_drafts_dm ON dm_notification_drafts;
CREATE POLICY dm_notification_drafts_dm ON dm_notification_drafts
  FOR ALL
  TO authenticated
  USING (is_session_master(session_id))
  WITH CHECK (is_session_master(session_id));

DROP POLICY IF EXISTS dm_notes_dm ON dm_notes;
CREATE POLICY dm_notes_dm ON dm_notes
  FOR ALL
  TO authenticated
  USING (is_session_master(session_id))
  WITH CHECK (is_session_master(session_id));

DROP POLICY IF EXISTS dm_checklists_dm ON dm_checklists;
CREATE POLICY dm_checklists_dm ON dm_checklists
  FOR ALL
  TO authenticated
  USING (is_session_master(session_id))
  WITH CHECK (is_session_master(session_id));

DROP POLICY IF EXISTS dm_mobs_dm ON dm_mobs;
CREATE POLICY dm_mobs_dm ON dm_mobs
  FOR ALL
  TO authenticated
  USING (is_session_master(session_id))
  WITH CHECK (is_session_master(session_id));

NOTIFY pgrst, 'reload schema';
