-- Temporizador de sesión (play/pause) y ventana de subida de habilidades.
-- Pega este archivo en el SQL Editor si no usas `npm run db:push`.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS skill_timer_running BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS skill_timer_elapsed_seconds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skill_timer_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS skill_advancement_open BOOLEAN NOT NULL DEFAULT false;

-- Los jugadores ya no pueden editar skills a pelo: check y rango van por RPC.
DROP POLICY IF EXISTS skills_access ON skills;
DROP POLICY IF EXISTS skills_select ON skills;
DROP POLICY IF EXISTS skills_dm ON skills;

CREATE POLICY skills_select ON skills FOR SELECT USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND is_session_member(c.session_id))
);

CREATE POLICY skills_dm ON skills FOR ALL USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND is_session_dm(c.session_id))
);

CREATE OR REPLACE FUNCTION session_timer_flush(p_session_id UUID)
RETURNS INT AS $$
DECLARE
  s sessions%ROWTYPE;
  elapsed INT;
BEGIN
  SELECT * INTO s FROM sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesión no encontrada'; END IF;
  elapsed := COALESCE(s.skill_timer_elapsed_seconds, 0);
  IF s.skill_timer_running AND s.skill_timer_started_at IS NOT NULL THEN
    elapsed := elapsed + GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - s.skill_timer_started_at)))::INT);
  END IF;
  RETURN elapsed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION set_skill_timer(p_session_id UUID, p_running BOOLEAN)
RETURNS sessions AS $$
DECLARE
  s sessions%ROWTYPE;
  elapsed INT;
BEGIN
  IF NOT is_session_dm(p_session_id) THEN
    RAISE EXCEPTION 'Solo el Dungeon Master';
  END IF;

  elapsed := session_timer_flush(p_session_id);

  IF p_running THEN
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

CREATE OR REPLACE FUNCTION set_skill_advancement(p_session_id UUID, p_open BOOLEAN)
RETURNS sessions AS $$
DECLARE
  s sessions%ROWTYPE;
  elapsed INT;
BEGIN
  IF NOT is_session_dm(p_session_id) THEN
    RAISE EXCEPTION 'Solo el Dungeon Master';
  END IF;

  elapsed := session_timer_flush(p_session_id);

  IF p_open THEN
    UPDATE sessions SET
      skill_advancement_open = true,
      skill_timer_running = false,
      skill_timer_elapsed_seconds = elapsed,
      skill_timer_started_at = NULL,
      skill_advancement_hours = ROUND(elapsed / 3600.0, 2),
      updated_at = now()
    WHERE id = p_session_id
    RETURNING * INTO s;

    INSERT INTO event_log (session_id, event_type, actor_id, message)
    VALUES (p_session_id, 'SYSTEM', auth.uid(), 'Subida de habilidades abierta.');

    INSERT INTO notifications (session_id, user_id, notification_type, title, body)
    SELECT p_session_id, c.owner_user_id, 'system',
      'Subida de habilidades',
      'El máster ha abierto la ventana. Sube o baja el rango de las skills que has marcado.'
    FROM crawlers c
    WHERE c.session_id = p_session_id AND c.owner_user_id IS NOT NULL;
  ELSE
    UPDATE skills sk
    SET check_marks = 0
    FROM crawlers c
    WHERE sk.crawler_id = c.id AND c.session_id = p_session_id;

    UPDATE sessions SET
      skill_advancement_open = false,
      skill_timer_running = false,
      skill_timer_elapsed_seconds = 0,
      skill_timer_started_at = NULL,
      skill_advancement_hours = 0,
      updated_at = now()
    WHERE id = p_session_id
    RETURNING * INTO s;

    INSERT INTO event_log (session_id, event_type, actor_id, message)
    VALUES (p_session_id, 'SYSTEM', auth.uid(), 'Subida de habilidades cerrada. Temporizador a cero.');
  END IF;

  RETURN s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION set_skill_checked(p_skill_id UUID, p_checked BOOLEAN)
RETURNS skills AS $$
DECLARE
  sk skills%ROWTYPE;
BEGIN
  SELECT * INTO sk FROM skills WHERE id = p_skill_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Habilidad no encontrada'; END IF;
  IF sk.skill_type = 'passive' THEN
    RAISE EXCEPTION 'Las pasivas no se marcan';
  END IF;
  IF EXISTS (
    SELECT 1 FROM crawlers c
    JOIN sessions s ON s.id = c.session_id
    WHERE c.id = sk.crawler_id AND COALESCE(s.skill_advancement_open, false)
  ) THEN
    RAISE EXCEPTION 'No se pueden cambiar marcas durante la subida';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM crawlers c
    WHERE c.id = sk.crawler_id
      AND (c.owner_user_id = auth.uid() OR is_session_dm(c.session_id))
  ) THEN
    RAISE EXCEPTION 'No puedes marcar esta habilidad';
  END IF;

  UPDATE skills SET check_marks = CASE WHEN p_checked THEN 1 ELSE 0 END
  WHERE id = p_skill_id
  RETURNING * INTO sk;
  RETURN sk;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION mark_skill_used(p_skill_id UUID)
RETURNS skills AS $$
BEGIN
  RETURN set_skill_checked(p_skill_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION adjust_skill_rank(p_skill_id UUID, p_delta INT)
RETURNS skills AS $$
DECLARE
  sk skills%ROWTYPE;
  sess sessions%ROWTYPE;
  next_rank INT;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'Delta inválido';
  END IF;
  IF ABS(p_delta) <> 1 THEN
    RAISE EXCEPTION 'Solo un punto cada vez';
  END IF;

  SELECT * INTO sk FROM skills WHERE id = p_skill_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Habilidad no encontrada'; END IF;

  SELECT s.* INTO sess
  FROM crawlers c
  JOIN sessions s ON s.id = c.session_id
  WHERE c.id = sk.crawler_id;

  IF sess.id IS NULL THEN RAISE EXCEPTION 'Sesión no encontrada'; END IF;
  IF NOT COALESCE(sess.skill_advancement_open, false) THEN
    RAISE EXCEPTION 'La subida de habilidades no está abierta';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM crawlers c WHERE c.id = sk.crawler_id AND c.owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No es tu crawler';
  END IF;
  IF COALESCE(sk.check_marks, 0) <= 0 THEN
    RAISE EXCEPTION 'Solo puedes ajustar skills que hayas marcado';
  END IF;

  next_rank := sk.rank + p_delta;
  IF next_rank < 0 THEN RAISE EXCEPTION 'El rango no puede bajar de 0'; END IF;
  IF next_rank > 20 THEN RAISE EXCEPTION 'El rango no puede pasar de 20'; END IF;

  UPDATE skills SET rank = next_rank WHERE id = p_skill_id RETURNING * INTO sk;
  RETURN sk;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION set_skill_timer(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION set_skill_advancement(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION set_skill_checked(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_skill_used(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_skill_rank(UUID, INT) TO authenticated;

ALTER TABLE skills REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE skills;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
