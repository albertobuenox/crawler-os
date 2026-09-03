-- Catálogo CarlRPG de habilidades (ROLL OR CHOOSE) y vínculo con cada crawler.
-- Pega este archivo en el SQL Editor. No vuelvas a pegar el schema inicial.

CREATE TABLE IF NOT EXISTS skill_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  roll_min INT NOT NULL CHECK (roll_min BETWEEN 1 AND 100),
  roll_max INT NOT NULL CHECK (roll_max BETWEEN 1 AND 100 AND roll_max >= roll_min),
  page_ref INT NOT NULL,
  animal_only BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO skill_catalog (slug, name, roll_min, roll_max, page_ref, animal_only)
VALUES
  ('aiming', 'Aiming', 1, 1, 27, false),
  ('ambush', 'Ambush', 2, 3, 27, false),
  ('animal-handling', 'Animal Handling', 4, 5, 27, false),
  ('axe', 'Axe', 6, 6, 23, false),
  ('back-claw', 'Back Claw', 7, 7, 22, true),
  ('bite', 'Bite', 8, 9, 22, true),
  ('bow', 'Bow', 10, 11, 25, false),
  ('catcher', 'Catcher', 12, 13, 27, false),
  ('chopper-pilot', 'Chopper Pilot', 14, 15, 28, false),
  ('climbing', 'Climbing', 16, 16, 28, false),
  ('club', 'Club', 17, 17, 23, false),
  ('crossbow', 'Crossbow', 18, 19, 25, false),
  ('dagger', 'Dagger', 20, 21, 23, false),
  ('deception', 'Deception', 22, 23, 28, false),
  ('detect-lies', 'Detect Lies', 24, 25, 28, false),
  ('detect-trap', 'Detect Trap', 26, 27, 28, false),
  ('determine-value', 'Determine Value', 28, 28, 28, false),
  ('dodge', 'Dodge', 29, 29, 29, false),
  ('driving', 'Driving', 30, 31, 29, false),
  ('dumpster-diving', 'Dumpster Diving', 32, 32, 29, false),
  ('endurance', 'Endurance', 33, 34, 29, false),
  ('engineering', 'Engineering', 35, 36, 30, false),
  ('escape-artist', 'Escape Artist', 37, 38, 30, false),
  ('explosives-handling', 'Explosives Handling', 39, 40, 30, false),
  ('fabricate', 'Fabricate', 41, 42, 30, false),
  ('find-crawler', 'Find Crawler', 43, 44, 30, false),
  ('first-aid', 'First Aid', 45, 46, 30, false),
  ('foot-soldier', 'Foot Soldier', 47, 48, 24, false),
  ('goblin-explosives', 'Goblin Explosives', 49, 50, 30, false),
  ('good-first-impression', 'Good First Impression', 51, 52, 31, false),
  ('handgun', 'Handgun', 53, 54, 26, false),
  ('hide-in-shadows', 'Hide in Shadows', 55, 56, 31, false),
  ('incendiary-device-handling', 'Incendiary Device Handling', 57, 58, 31, false),
  ('improvised-weapons', 'Improvised Weapons', 59, 59, 23, false),
  ('intimidate', 'Intimidate', 60, 61, 31, false),
  ('investigation', 'Investigation', 62, 63, 32, false),
  ('javelin', 'Javelin', 64, 64, 26, false),
  ('jumping', 'Jumping', 65, 65, 32, false),
  ('light-on-your-feet', 'Light on Your Feet', 66, 67, 32, true),
  ('lockpicking', 'Lockpicking', 68, 69, 32, false),
  ('longsword', 'Longsword', 70, 70, 23, false),
  ('negotiation', 'Negotiation', 71, 72, 32, false),
  ('noggin-nocker', 'Noggin Nocker', 73, 73, 24, false),
  ('perception', 'Perception', 74, 74, 32, false),
  ('performance', 'Performance', 75, 76, 32, false),
  ('persuasion', 'Persuasion', 77, 77, 33, false),
  ('polearm', 'Polearm', 78, 78, 26, false),
  ('pugilism', 'Pugilism', 79, 79, 24, false),
  ('quarterstaff', 'Quarterstaff', 80, 80, 26, false),
  ('regeneration', 'Regeneration', 81, 81, 33, false),
  ('repair', 'Repair', 82, 82, 33, false),
  ('running', 'Running', 83, 83, 33, false),
  ('salvage', 'Salvage', 84, 84, 34, false),
  ('shotgun', 'Shotgun', 85, 85, 25, false),
  ('shuriken', 'Shuriken', 86, 86, 26, false),
  ('sleight-of-hand', 'Sleight of Hand', 87, 87, 34, false),
  ('slice-attack', 'Slice Attack', 88, 88, 23, true),
  ('slingshot', 'Slingshot', 89, 89, 26, false),
  ('stealth', 'Stealth', 90, 90, 34, false),
  ('streetwise', 'Streetwise', 91, 91, 34, false),
  ('survival', 'Survival', 92, 92, 34, false),
  ('swimming', 'Swimming', 93, 93, 34, false),
  ('tactics', 'Tactics', 94, 94, 35, false),
  ('taunt', 'Taunt', 95, 95, 35, false),
  ('throwing', 'Throwing', 96, 96, 35, false),
  ('tracking', 'Tracking', 97, 97, 35, false),
  ('unarmed-combat', 'Unarmed Combat', 98, 98, 24, false),
  ('warhammer', 'Warhammer', 99, 99, 23, false),
  ('wrasslin', 'Wrasslin''', 100, 100, 24, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  roll_min = EXCLUDED.roll_min,
  roll_max = EXCLUDED.roll_max,
  page_ref = EXCLUDED.page_ref,
  animal_only = EXCLUDED.animal_only;

ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS catalog_id UUID REFERENCES skill_catalog(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS skills_crawler_catalog_uidx
  ON skills (crawler_id, catalog_id)
  WHERE catalog_id IS NOT NULL;

ALTER TABLE skill_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_catalog_read ON skill_catalog;
CREATE POLICY skill_catalog_read ON skill_catalog
  FOR SELECT
  USING (true);

GRANT SELECT ON skill_catalog TO anon, authenticated;
