-- Attack skills que tenían icono pero no estaban en el catálogo d100.
-- No ocupan tirada: pickSkillByRoll las ignora (OFF_TABLE_SKILL_SLUGS).
-- roll 100 las agrupa al final sin romper el CHECK 1–100.

INSERT INTO skill_catalog (slug, name, roll_min, roll_max, page_ref, animal_only)
VALUES
  ('choke-out', 'Choke Out', 100, 100, 24, false),
  ('dirty-fighting', 'Dirty Fighting', 100, 100, 24, false),
  ('herding-weapons', 'Herding Weapons', 100, 100, 23, false),
  ('iron-punch', 'Iron Punch', 100, 100, 24, false),
  ('lance', 'Lance', 100, 100, 26, false),
  ('powerful-strike', 'Powerful Strike', 100, 100, 24, false),
  ('rapier', 'Rapier', 100, 100, 23, false),
  ('skullcracker', 'Skullcracker', 100, 100, 24, false),
  ('smush', 'Smush', 100, 100, 24, false),
  ('toss', 'Toss', 100, 100, 26, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  page_ref = EXCLUDED.page_ref,
  animal_only = EXCLUDED.animal_only;
