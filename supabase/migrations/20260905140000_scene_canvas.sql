-- Lienzo de Escena: mapas y fichas en el marco compartido.
-- El Master escribe el canvas completo. Un crawler solo mueve su propia ficha.

ALTER TABLE table_state
  ADD COLUMN IF NOT EXISTS canvas JSONB NOT NULL DEFAULT jsonb_build_object(
    'maps', '[]'::jsonb,
    'tokens', '[]'::jsonb,
    'pan_x', 0.5,
    'pan_y', 0.5,
    'zoom', 1,
    'updated_at', to_jsonb(now())
  );

CREATE OR REPLACE FUNCTION move_own_scene_token(
  p_session_id UUID,
  p_token_id TEXT,
  p_x DOUBLE PRECISION,
  p_y DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_crawler UUID;
  v_canvas JSONB;
  v_tokens JSONB;
  v_token JSONB;
  v_owner TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT is_session_member(p_session_id) THEN
    RAISE EXCEPTION 'Not a session member';
  END IF;
  IF p_x IS NULL OR p_y IS NULL OR p_x <> p_x OR p_y <> p_y THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  SELECT id INTO v_crawler
  FROM crawlers
  WHERE session_id = p_session_id AND owner_user_id = v_user
  LIMIT 1;

  IF v_crawler IS NULL THEN
    RAISE EXCEPTION 'No crawler in this session';
  END IF;

  SELECT canvas INTO v_canvas
  FROM table_state
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF v_canvas IS NULL THEN
    RAISE EXCEPTION 'No scene canvas';
  END IF;

  v_tokens := COALESCE(v_canvas->'tokens', '[]'::jsonb);

  SELECT t, t->>'crawler_id'
  INTO v_token, v_owner
  FROM jsonb_array_elements(v_tokens) AS t
  WHERE t->>'id' = p_token_id
  LIMIT 1;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Token not found';
  END IF;

  IF v_owner IS NULL OR v_owner <> v_crawler::text THEN
    RAISE EXCEPTION 'Not your token';
  END IF;

  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = p_token_id THEN
        elem || jsonb_build_object(
          'x', GREATEST(-2::float8, LEAST(3::float8, p_x)),
          'y', GREATEST(-2::float8, LEAST(3::float8, p_y))
        )
      ELSE elem
    END
  )
  INTO v_tokens
  FROM jsonb_array_elements(v_tokens) AS elem;

  v_canvas := jsonb_set(v_canvas, '{tokens}', COALESCE(v_tokens, '[]'::jsonb), true);
  v_canvas := jsonb_set(v_canvas, '{updated_at}', to_jsonb(now()::text), true);

  UPDATE table_state
  SET canvas = v_canvas
  WHERE session_id = p_session_id;

  RETURN v_canvas;
END;
$$;

GRANT EXECUTE ON FUNCTION move_own_scene_token(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'scene-assets',
    'scene-assets',
    true,
    8388608,
    ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/gif']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS scene_assets_public_read ON storage.objects;
  CREATE POLICY scene_assets_public_read ON storage.objects
    FOR SELECT
    USING (bucket_id = 'scene-assets');

  DROP POLICY IF EXISTS scene_assets_dm_write ON storage.objects;
  CREATE POLICY scene_assets_dm_write ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'scene-assets' AND public.is_dm())
    WITH CHECK (bucket_id = 'scene-assets' AND public.is_dm());
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Storage scene-assets no configurado: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
