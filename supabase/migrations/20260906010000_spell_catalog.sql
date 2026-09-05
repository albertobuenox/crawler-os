-- Catálogo de conjuros (paralelo a skills) y asignaciones por crawler.
-- Pega este archivo en el SQL Editor si no usas `npm run db:push`.

CREATE TABLE IF NOT EXISTS spell_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'ataque'
    CHECK (kind IN ('ataque', 'defensa', 'apoyo', 'destreza')),
  thumb_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawler_id UUID NOT NULL REFERENCES crawlers(id) ON DELETE CASCADE,
  catalog_id UUID REFERENCES spell_catalog(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  rank INT NOT NULL DEFAULT 1 CHECK (rank >= 1 AND rank <= 30),
  linked_stat stat_key NOT NULL DEFAULT 'int',
  check_marks INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crawler_id, catalog_id)
);

CREATE INDEX IF NOT EXISTS idx_spells_crawler ON spells(crawler_id);
CREATE INDEX IF NOT EXISTS idx_spells_catalog ON spells(catalog_id);

INSERT INTO spell_catalog (slug, name, description, kind)
VALUES (
  'mind-tickle',
  'Mind Tickle',
  'Un cosquilleo psíquico que se clava entre las neuronas. El objetivo agarra la cabeza y pierde el hilo un instante. Daño mental. El primer conjuro que el sistema te deja lanzar de verdad.',
  'ataque'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = CASE
    WHEN spell_catalog.description IS NULL OR spell_catalog.description = '' THEN EXCLUDED.description
    ELSE spell_catalog.description
  END,
  kind = EXCLUDED.kind;

ALTER TABLE spell_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE spells ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON spell_catalog TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON spell_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON spells TO authenticated;

DROP POLICY IF EXISTS spell_catalog_read ON spell_catalog;
CREATE POLICY spell_catalog_read ON spell_catalog
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS spell_catalog_dm_write ON spell_catalog;
CREATE POLICY spell_catalog_dm_write ON spell_catalog
  FOR ALL
  TO authenticated
  USING (public.is_dm())
  WITH CHECK (public.is_dm());

DROP POLICY IF EXISTS spells_select ON spells;
CREATE POLICY spells_select ON spells FOR SELECT USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND is_session_member(c.session_id))
);

DROP POLICY IF EXISTS spells_dm ON spells;
CREATE POLICY spells_dm ON spells FOR ALL USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND is_session_dm(c.session_id))
);

CREATE OR REPLACE FUNCTION set_spell_checked(p_spell_id UUID, p_checked BOOLEAN)
RETURNS spells AS $$
DECLARE
  sp spells%ROWTYPE;
BEGIN
  SELECT * INTO sp FROM spells WHERE id = p_spell_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conjuro no encontrado'; END IF;
  IF EXISTS (
    SELECT 1 FROM crawlers c
    JOIN sessions s ON s.id = c.session_id
    WHERE c.id = sp.crawler_id AND COALESCE(s.skill_advancement_open, false)
  ) THEN
    RAISE EXCEPTION 'No se pueden cambiar marcas durante la subida';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM crawlers c
    WHERE c.id = sp.crawler_id
      AND (c.owner_user_id = auth.uid() OR is_session_dm(c.session_id))
  ) THEN
    RAISE EXCEPTION 'No puedes marcar este conjuro';
  END IF;

  UPDATE spells SET check_marks = CASE WHEN p_checked THEN 1 ELSE 0 END
  WHERE id = p_spell_id
  RETURNING * INTO sp;
  RETURN sp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION adjust_spell_rank(p_spell_id UUID, p_delta INT)
RETURNS spells AS $$
DECLARE
  sp spells%ROWTYPE;
  sess sessions%ROWTYPE;
  next_rank INT;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'Delta inválido';
  END IF;
  IF ABS(p_delta) <> 1 THEN
    RAISE EXCEPTION 'Solo un punto cada vez';
  END IF;

  SELECT * INTO sp FROM spells WHERE id = p_spell_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conjuro no encontrado'; END IF;

  SELECT s.* INTO sess
  FROM crawlers c
  JOIN sessions s ON s.id = c.session_id
  WHERE c.id = sp.crawler_id;

  IF sess.id IS NULL THEN RAISE EXCEPTION 'Sesión no encontrada'; END IF;
  IF NOT COALESCE(sess.skill_advancement_open, false) THEN
    RAISE EXCEPTION 'La subida de habilidades no está abierta';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM crawlers c WHERE c.id = sp.crawler_id AND c.owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No es tu crawler';
  END IF;
  IF COALESCE(sp.check_marks, 0) <= 0 THEN
    RAISE EXCEPTION 'Solo puedes ajustar spells que hayas marcado';
  END IF;

  next_rank := sp.rank + p_delta;
  IF next_rank < 1 THEN RAISE EXCEPTION 'El rango no puede bajar de 1'; END IF;
  IF next_rank > 30 THEN RAISE EXCEPTION 'El rango no puede pasar de 30'; END IF;

  UPDATE spells SET rank = next_rank WHERE id = p_spell_id RETURNING * INTO sp;
  RETURN sp;
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
      'El máster ha abierto la ventana. Sube o baja el rango de las skills y spells que has marcado.'
    FROM crawlers c
    WHERE c.session_id = p_session_id AND c.owner_user_id IS NOT NULL;
  ELSE
    UPDATE skills sk
    SET check_marks = 0
    FROM crawlers c
    WHERE sk.crawler_id = c.id AND c.session_id = p_session_id;

    UPDATE spells sp
    SET check_marks = 0
    FROM crawlers c
    WHERE sp.crawler_id = c.id AND c.session_id = p_session_id;

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

GRANT EXECUTE ON FUNCTION set_spell_checked(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_spell_rank(UUID, INT) TO authenticated;

ALTER TABLE spells REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE spells;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
