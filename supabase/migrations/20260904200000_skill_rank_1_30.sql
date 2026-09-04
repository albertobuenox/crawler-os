-- Skills rank from 1 to 30 (was 0–20).

UPDATE skills SET rank = 1 WHERE rank < 1;
UPDATE skills SET rank = 30 WHERE rank > 30;

ALTER TABLE skills ALTER COLUMN rank SET DEFAULT 1;

ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_rank_range;
ALTER TABLE skills ADD CONSTRAINT skills_rank_range CHECK (rank >= 1 AND rank <= 30);

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
  IF next_rank < 1 THEN RAISE EXCEPTION 'El rango no puede bajar de 1'; END IF;
  IF next_rank > 30 THEN RAISE EXCEPTION 'El rango no puede pasar de 30'; END IF;

  UPDATE skills SET rank = next_rank WHERE id = p_skill_id RETURNING * INTO sk;
  RETURN sk;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
