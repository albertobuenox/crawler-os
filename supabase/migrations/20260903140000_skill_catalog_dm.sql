-- El Dungeon Master puede crear, editar y borrar entradas del catálogo de skills.
-- Pega este archivo en el SQL Editor de Supabase si no usas `supabase db push`.

CREATE OR REPLACE FUNCTION public.is_dm()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dm'
  );
$$;

GRANT INSERT, UPDATE, DELETE ON public.skill_catalog TO authenticated;

DROP POLICY IF EXISTS skill_catalog_dm_write ON public.skill_catalog;
CREATE POLICY skill_catalog_dm_write ON public.skill_catalog
  FOR ALL
  TO authenticated
  USING (public.is_dm())
  WITH CHECK (public.is_dm());
