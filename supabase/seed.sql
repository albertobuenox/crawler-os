-- Cuentas y sesión de prueba para varios clientes locales.
-- Contraseña de todos: crawleros
-- Código de mesa: FLOOR-TEST

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'dm@crawler.local',
    crypt('crawleros', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"dm","display_name":"Dungeon Master"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'crawler1@crawler.local',
    crypt('crawleros', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"crawler","display_name":"Carl"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'crawler2@crawler.local',
    crypt('crawleros', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"crawler","display_name":"Donut"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email IN ('dm@crawler.local', 'crawler1@crawler.local', 'crawler2@crawler.local')
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  );

UPDATE profiles
SET role = 'dm', display_name = 'Dungeon Master'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE profiles
SET role = 'crawler', display_name = 'Carl'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE profiles
SET role = 'crawler', display_name = 'Donut'
WHERE id = '33333333-3333-3333-3333-333333333333';

INSERT INTO sessions (id, code, name, floor_number, phase, created_by, is_active)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'FLOOR-TEST',
  'Piso de pruebas',
  1,
  'exploration',
  '11111111-1111-1111-1111-111111111111',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO session_members (session_id, user_id)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (session_id, user_id) DO NOTHING;

INSERT INTO table_state (id, session_id, shown_type, title, body_text)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  '44444444-4444-4444-4444-444444444444',
  'text',
  'Bienvenidos al dungeon',
  'El Dungeon Master controla la mesa. Los crawlers entran con FLOOR-TEST.'
)
ON CONFLICT (session_id) DO NOTHING;

INSERT INTO crawlers (
  id, session_id, name, race, class_name, level,
  str_base, int_base, con_base, dex_base, cha_base,
  str_enhanced, int_enhanced, con_enhanced, dex_enhanced, cha_enhanced,
  mana_current, mana_max, status
) VALUES
  (
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    'Carl',
    'Humano',
    NULL,
    1,
    6, 3, 5, 4, 2,
    6, 3, 5, 4, 2,
    3, 3,
    'exploring'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    'Donut',
    'Gato',
    NULL,
    1,
    2, 5, 3, 4, 6,
    2, 5, 3, 4, 6,
    5, 5,
    'exploring'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO resources (id, session_id, kind, name, rarity, description, system_copy)
VALUES
  (
    '77777777-7777-7777-7777-777777777777',
    '44444444-4444-4444-4444-444444444444',
    'item',
    'Medkit de pasillo',
    'uncommon',
    'Cura una caja de salud. Sabe a plástico y esperanza.',
    'BORANT CORP te concede atención médica. No te acostumbres.'
  ),
  (
    '99999999-9999-9999-9999-999999999999',
    '44444444-4444-4444-4444-444444444444',
    'map',
    'Croquis del primer piso',
    'common',
    'Un plano sucio del dungeon.',
    'Esto es un mapa. Úsalo o muere perdido. BORANT CORP no insiste.'
  )
ON CONFLICT (id) DO NOTHING;
