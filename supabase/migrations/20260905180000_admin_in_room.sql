-- El Master puede declarar un administrador de Borant en la sala.
-- Bloquea la escena de los crawlers hasta que lo desactive.

ALTER TABLE table_state
  ADD COLUMN IF NOT EXISTS admin_in_room BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
