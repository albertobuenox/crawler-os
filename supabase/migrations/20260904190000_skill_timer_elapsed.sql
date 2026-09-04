-- Reset y edición manual del temporizador de sesión.
-- Pega este archivo en el SQL Editor si no usas `npm run db:push`.

CREATE OR REPLACE FUNCTION set_skill_timer_elapsed(
  p_session_id UUID,
  p_elapsed_seconds INT,
  p_running BOOLEAN DEFAULT NULL
)
RETURNS sessions AS $$
DECLARE
  s sessions%ROWTYPE;
  elapsed INT;
  keep_running BOOLEAN;
BEGIN
  IF NOT is_session_dm(p_session_id) THEN
    RAISE EXCEPTION 'Solo el Dungeon Master';
  END IF;

  SELECT skill_timer_running INTO keep_running
  FROM sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesión no encontrada'; END IF;

  elapsed := GREATEST(0, COALESCE(p_elapsed_seconds, 0));
  keep_running := COALESCE(p_running, keep_running, false);

  IF keep_running THEN
    UPDATE sessions SET
      skill_timer_running = true,
      skill_timer_elapsed_seconds = elapsed,
      skill_timer_started_at = now(),
      skill_advancement_hours = ROUND(elapsed / 3600.0, 2),
      updated_at = now()
    WHERE id = p_session_id
    RETURNING * INTO s;
  ELSE
    UPDATE sessions SET
      skill_timer_running = false,
      skill_timer_elapsed_seconds = elapsed,
      skill_timer_started_at = NULL,
      skill_advancement_hours = ROUND(elapsed / 3600.0, 2),
      updated_at = now()
    WHERE id = p_session_id
    RETURNING * INTO s;
  END IF;

  RETURN s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION set_skill_timer_elapsed(UUID, INT, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
