-- Crawler OS — schema completo (CarlRPG session tool)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('dm', 'crawler');
CREATE TYPE session_phase AS ENUM (
  'exploration', 'combat_1', 'combat_2', 'combat_3', 'combat_4', 'combat_5', 'rest', 'paused'
);
CREATE TYPE crawler_status AS ENUM ('exploring', 'combat', 'downed', 'dead', 'afk');
CREATE TYPE resource_kind AS ENUM (
  'item', 'achievement', 'map', 'monster', 'npc', 'box', 'buff', 'debuff', 'quest', 'floor', 'skill_template'
);
CREATE TYPE rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary', 'celestial');
CREATE TYPE event_type AS ENUM ('REWARD', 'PENALTY', 'SYSTEM', 'COMBAT', 'ROLL', 'ACHIEVEMENT', 'REST');
CREATE TYPE notification_type AS ENUM ('reward', 'penalty', 'system', 'combat', 'roll', 'achievement', 'loot_box');
CREATE TYPE skill_type AS ENUM ('attack', 'spell', 'utility', 'passive');
CREATE TYPE stat_key AS ENUM ('str', 'int', 'con', 'dex', 'cha');
CREATE TYPE effect_kind AS ENUM ('internal', 'external', 'debuff');
CREATE TYPE dice_roll_kind AS ENUM ('opposed', 'unopposed', 'stat_check', 'attack', 'scaled');
CREATE TYPE dice_request_status AS ENUM ('pending', 'rolled', 'cancelled');
CREATE TYPE loot_box_status AS ENUM ('sealed', 'opening', 'opened');
CREATE TYPE rest_type AS ENUM ('short', 'long', 'full_day');
CREATE TYPE table_shown_type AS ENUM ('none', 'map', 'item', 'monster', 'text', 'image');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'crawler',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'New Floor',
  floor_number INT NOT NULL DEFAULT 1,
  phase session_phase NOT NULL DEFAULT 'exploration',
  created_by UUID NOT NULL REFERENCES profiles(id),
  session_started_at TIMESTAMPTZ DEFAULT now(),
  skill_advancement_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_code ON sessions(code);

-- Session membership
CREATE TABLE session_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crawler_id UUID,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Crawlers (character sheets)
CREATE TABLE crawlers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Identity
  name TEXT NOT NULL,
  race TEXT,
  gender_pronouns TEXT,
  level INT NOT NULL DEFAULT 1,
  crawler_number TEXT,
  class_name TEXT,
  floor INT NOT NULL DEFAULT 1,
  size TEXT,
  deity TEXT,
  portrait_url TEXT,
  -- Stats unenhanced
  str_base INT NOT NULL DEFAULT 10,
  int_base INT NOT NULL DEFAULT 10,
  con_base INT NOT NULL DEFAULT 10,
  dex_base INT NOT NULL DEFAULT 10,
  cha_base INT NOT NULL DEFAULT 10,
  -- Stats enhanced (computed + manual overrides)
  str_enhanced INT NOT NULL DEFAULT 10,
  int_enhanced INT NOT NULL DEFAULT 10,
  con_enhanced INT NOT NULL DEFAULT 10,
  dex_enhanced INT NOT NULL DEFAULT 10,
  cha_enhanced INT NOT NULL DEFAULT 10,
  -- Resources
  hp_boxes_filled INT NOT NULL DEFAULT 0 CHECK (hp_boxes_filled >= 0 AND hp_boxes_filled <= 10),
  mana_current INT NOT NULL DEFAULT 10,
  mana_max INT NOT NULL DEFAULT 10,
  dr_total INT NOT NULL DEFAULT 0,
  evade_total INT NOT NULL DEFAULT 0,
  move INT NOT NULL DEFAULT 30,
  step INT NOT NULL DEFAULT 5,
  armor TEXT,
  ai_favor_remaining INT NOT NULL DEFAULT 2,
  size_combat TEXT,
  -- Lore
  past_trauma TEXT,
  popularity TEXT,
  loose_ends TEXT,
  regrets TEXT,
  notes TEXT,
  personal_space JSONB DEFAULT '{}',
  amenities JSONB DEFAULT '[]',
  pet JSONB DEFAULT '{}',
  mount_vehicle JSONB DEFAULT '{}',
  clubs JSONB DEFAULT '[]',
  sponsors JSONB DEFAULT '[]',
  racial_abilities JSONB DEFAULT '[]',
  class_abilities JSONB DEFAULT '[]',
  things_killed JSONB DEFAULT '[]',
  analyze_intel JSONB DEFAULT '{}',
  status crawler_status NOT NULL DEFAULT 'exploring',
  unconscious_rounds_remaining INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crawlers_session ON crawlers(session_id);

-- Skills
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawler_id UUID NOT NULL REFERENCES crawlers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  skill_type skill_type NOT NULL DEFAULT 'utility',
  rank INT NOT NULL DEFAULT 0,
  linked_stat stat_key NOT NULL DEFAULT 'str',
  check_marks INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attacks (up to 3)
CREATE TABLE attacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawler_id UUID NOT NULL REFERENCES crawlers(id) ON DELETE CASCADE,
  slot INT NOT NULL CHECK (slot >= 1 AND slot <= 3),
  name TEXT NOT NULL,
  to_hit_bonus INT NOT NULL DEFAULT 0,
  damage_dice TEXT NOT NULL DEFAULT '1d6',
  damage_stat stat_key,
  effects TEXT,
  UNIQUE(crawler_id, slot)
);

-- Resource catalog (Dungeon Master creates anything)
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  kind resource_kind NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  rarity rarity NOT NULL DEFAULT 'common',
  description TEXT,
  system_copy TEXT,
  icon_url TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_session ON resources(session_id);

-- Item instances (inventory)
CREATE TABLE item_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawler_id UUID NOT NULL REFERENCES crawlers(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  equipped_slot TEXT,
  hotlist_index INT CHECK (hotlist_index >= 0 AND hotlist_index <= 9),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Modifiers
CREATE TABLE modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawler_id UUID NOT NULL REFERENCES crawlers(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID,
  target_field TEXT NOT NULL,
  value INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Effects (buffs/debuffs)
CREATE TABLE effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawler_id UUID NOT NULL REFERENCES crawlers(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  effect_kind effect_kind NOT NULL,
  is_stackable BOOLEAN NOT NULL DEFAULT false,
  duration_rounds INT,
  duration_minutes INT,
  payload JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table state (shared "Mesa")
CREATE TABLE table_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  shown_type table_shown_type NOT NULL DEFAULT 'none',
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  title TEXT,
  body_text TEXT,
  image_url TEXT,
  zoom NUMERIC(4,2) NOT NULL DEFAULT 1,
  pan_x NUMERIC(8,2) NOT NULL DEFAULT 0,
  pan_y NUMERIC(8,2) NOT NULL DEFAULT 0,
  show_grid BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Map pins
CREATE TABLE map_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  pin_type TEXT NOT NULL DEFAULT 'party',
  x NUMERIC(8,4) NOT NULL,
  y NUMERIC(8,4) NOT NULL,
  color TEXT DEFAULT '#00D4FF',
  crawler_id UUID REFERENCES crawlers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dice
CREATE TABLE dice_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  crawler_id UUID REFERENCES crawlers(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  roll_kind dice_roll_kind NOT NULL DEFAULT 'stat_check',
  label TEXT NOT NULL,
  dc INT,
  advantage BOOLEAN NOT NULL DEFAULT false,
  disadvantage BOOLEAN NOT NULL DEFAULT false,
  mob_advantage BOOLEAN NOT NULL DEFAULT false,
  formula TEXT NOT NULL DEFAULT '1d20',
  status dice_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dice_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES dice_requests(id) ON DELETE CASCADE,
  raw_rolls INT[] NOT NULL,
  modifier INT NOT NULL DEFAULT 0,
  total INT NOT NULL,
  is_success BOOLEAN,
  rolled_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Combat
CREATE TABLE combat_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL DEFAULT 1,
  phase session_phase NOT NULL DEFAULT 'combat_1',
  mob_declarations JSONB DEFAULT '[]',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Achievements
CREATE TABLE achievements_unlocked (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  crawler_id UUID REFERENCES crawlers(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loot boxes
CREATE TABLE loot_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  assigned_crawler_id UUID REFERENCES crawlers(id) ON DELETE SET NULL,
  status loot_box_status NOT NULL DEFAULT 'sealed',
  contents JSONB NOT NULL DEFAULT '[]',
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event log
CREATE TABLE event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  target_crawler_id UUID REFERENCES crawlers(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_log_session ON event_log(session_id, created_at DESC);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  event_id UUID REFERENCES event_log(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  cinematic_shown BOOLEAN NOT NULL DEFAULT false,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Rests
CREATE TABLE rests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rest_type rest_type NOT NULL,
  applied_by UUID NOT NULL REFERENCES profiles(id),
  crawler_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sessions_updated BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER crawlers_updated BEFORE UPDATE ON crawlers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER resources_updated BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER table_state_updated BEFORE UPDATE ON table_state FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Stat modifier helper (CarlRPG: floor((stat-10)/2))
CREATE OR REPLACE FUNCTION stat_modifier(stat_value INT)
RETURNS INT AS $$
BEGIN
  RETURN FLOOR((stat_value - 10) / 2.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Compute DC
CREATE OR REPLACE FUNCTION compute_dc(
  p_kind dice_roll_kind,
  p_floor_number INT,
  p_antagonist_mod INT DEFAULT 0
)
RETURNS INT AS $$
BEGIN
  CASE p_kind
    WHEN 'opposed' THEN RETURN 10 + p_antagonist_mod + p_floor_number;
    WHEN 'unopposed' THEN RETURN 10 + p_floor_number * 2;
    WHEN 'stat_check' THEN RETURN 10 + p_floor_number;
    WHEN 'attack' THEN RETURN 10 + p_floor_number;
    ELSE RETURN 10 + p_floor_number;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recalc enhanced stats from base + modifiers
CREATE OR REPLACE FUNCTION recalc_crawler_enhanced(p_crawler_id UUID)
RETURNS VOID AS $$
DECLARE
  c RECORD;
  mod_str INT := 0;
  mod_int INT := 0;
  mod_con INT := 0;
  mod_dex INT := 0;
  mod_cha INT := 0;
BEGIN
  SELECT * INTO c FROM crawlers WHERE id = p_crawler_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(value), 0) INTO mod_str FROM modifiers
    WHERE crawler_id = p_crawler_id AND target_field = 'str' AND (expires_at IS NULL OR expires_at > now());
  SELECT COALESCE(SUM(value), 0) INTO mod_int FROM modifiers
    WHERE crawler_id = p_crawler_id AND target_field = 'int' AND (expires_at IS NULL OR expires_at > now());
  SELECT COALESCE(SUM(value), 0) INTO mod_con FROM modifiers
    WHERE crawler_id = p_crawler_id AND target_field = 'con' AND (expires_at IS NULL OR expires_at > now());
  SELECT COALESCE(SUM(value), 0) INTO mod_dex FROM modifiers
    WHERE crawler_id = p_crawler_id AND target_field = 'dex' AND (expires_at IS NULL OR expires_at > now());
  SELECT COALESCE(SUM(value), 0) INTO mod_cha FROM modifiers
    WHERE crawler_id = p_crawler_id AND target_field = 'cha' AND (expires_at IS NULL OR expires_at > now());

  UPDATE crawlers SET
    str_enhanced = c.str_base + mod_str,
    int_enhanced = c.int_base + mod_int,
    con_enhanced = c.con_base + mod_con,
    dex_enhanced = c.dex_base + mod_dex,
    cha_enhanced = c.cha_base + mod_cha,
    mana_max = c.int_base + mod_int,
    updated_at = now()
  WHERE id = p_crawler_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply damage (health boxes)
CREATE OR REPLACE FUNCTION apply_damage(
  p_crawler_id UUID,
  p_damage INT,
  p_damage_type TEXT DEFAULT 'slashing'
)
RETURNS JSONB AS $$
DECLARE
  c RECORD;
  box_value INT;
  boxes_to_fill INT;
  new_filled INT;
  result JSONB;
BEGIN
  SELECT * INTO c FROM crawlers WHERE id = p_crawler_id;
  IF NOT FOUND THEN RETURN '{"error":"crawler not found"}'::jsonb; END IF;

  box_value := GREATEST(stat_modifier(c.con_enhanced), 1);
  IF p_damage <= 0 THEN
    RETURN jsonb_build_object('boxes_filled', c.hp_boxes_filled, 'downed', false);
  END IF;

  boxes_to_fill := p_damage / box_value;
  new_filled := LEAST(c.hp_boxes_filled + boxes_to_fill, 10);

  UPDATE crawlers SET
    hp_boxes_filled = new_filled,
    status = CASE
      WHEN new_filled >= 10 THEN 'downed'::crawler_status
      ELSE c.status
    END,
    unconscious_rounds_remaining = CASE
      WHEN new_filled >= 10 THEN stat_modifier(c.con_enhanced)
      ELSE c.unconscious_rounds_remaining
    END,
    updated_at = now()
  WHERE id = p_crawler_id;

  result := jsonb_build_object(
    'boxes_filled', new_filled,
    'box_value', box_value,
    'downed', new_filled >= 10
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate session code
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'FLOOR-';
  i INT;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create session (Dungeon Master)
CREATE OR REPLACE FUNCTION create_game_session(p_name TEXT DEFAULT 'New Floor')
RETURNS JSONB AS $$
DECLARE
  v_code TEXT;
  v_session_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'dm') THEN
    RAISE EXCEPTION 'Only Dungeon Master can create a session';
  END IF;

  LOOP
    v_code := generate_session_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM sessions WHERE code = v_code);
  END LOOP;

  INSERT INTO sessions (code, name, created_by)
  VALUES (v_code, p_name, v_user_id)
  RETURNING id INTO v_session_id;

  INSERT INTO session_members (session_id, user_id) VALUES (v_session_id, v_user_id);
  INSERT INTO table_state (session_id) VALUES (v_session_id);

  RETURN jsonb_build_object('session_id', v_session_id, 'code', v_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Join session by code (claims first unowned crawler)
CREATE OR REPLACE FUNCTION join_session_by_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_session sessions%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_crawler_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_session FROM sessions WHERE code = upper(trim(p_code)) AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;

  INSERT INTO session_members (session_id, user_id)
  VALUES (v_session.id, v_user_id)
  ON CONFLICT (session_id, user_id) DO NOTHING;

  SELECT id INTO v_crawler_id FROM crawlers
    WHERE session_id = v_session.id AND owner_user_id = v_user_id
    LIMIT 1;

  IF v_crawler_id IS NULL THEN
    SELECT id INTO v_crawler_id FROM crawlers
      WHERE session_id = v_session.id AND owner_user_id IS NULL
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

    IF v_crawler_id IS NOT NULL THEN
      UPDATE crawlers SET owner_user_id = v_user_id WHERE id = v_crawler_id;
    END IF;
  END IF;

  IF v_crawler_id IS NOT NULL THEN
    UPDATE session_members SET crawler_id = v_crawler_id
      WHERE session_id = v_session.id AND user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'code', v_session.code,
    'crawler_id', v_crawler_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant resource to crawler(s)
CREATE OR REPLACE FUNCTION grant_resource(
  p_resource_id UUID,
  p_crawler_ids UUID[],
  p_mode TEXT DEFAULT 'reward',
  p_system_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  r resources%ROWTYPE;
  cid UUID;
  v_event_id UUID;
  v_user UUID := auth.uid();
BEGIN
  SELECT * INTO r FROM resources WHERE id = p_resource_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resource not found'; END IF;

  FOREACH cid IN ARRAY p_crawler_ids LOOP
    IF r.kind = 'item' OR r.kind = 'box' THEN
      INSERT INTO item_instances (crawler_id, resource_id, quantity)
      VALUES (cid, p_resource_id, 1);
    END IF;

    IF r.kind = 'achievement' THEN
      INSERT INTO achievements_unlocked (session_id, crawler_id, resource_id)
      VALUES (r.session_id, cid, p_resource_id);
    END IF;

    INSERT INTO event_log (session_id, event_type, actor_id, target_crawler_id, message, payload)
    VALUES (
      r.session_id,
      CASE p_mode WHEN 'penalty' THEN 'PENALTY'::event_type ELSE 'REWARD'::event_type END,
      v_user, cid,
      COALESCE(p_system_message, 'The System has granted: ' || r.name),
      jsonb_build_object('resource_id', p_resource_id, 'mode', p_mode)
    )
    RETURNING id INTO v_event_id;

    INSERT INTO notifications (session_id, user_id, notification_type, title, body, event_id, payload)
    SELECT r.session_id, sm.user_id,
      CASE p_mode WHEN 'penalty' THEN 'penalty'::notification_type ELSE 'reward'::notification_type END,
      CASE p_mode WHEN 'penalty' THEN 'PENALTY' ELSE 'REWARD' END,
      COALESCE(p_system_message, r.name),
      v_event_id,
      jsonb_build_object('resource_id', p_resource_id, 'resource_name', r.name, 'rarity', r.rarity)
    FROM session_members sm
    WHERE sm.crawler_id = cid OR sm.user_id IN (
      SELECT owner_user_id FROM crawlers WHERE id = cid
    );
  END LOOP;

  RETURN jsonb_build_object('granted', array_length(p_crawler_ids, 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit dice roll (server-side RNG)
CREATE OR REPLACE FUNCTION submit_dice_roll(p_request_id UUID, p_modifier INT DEFAULT 0)
RETURNS JSONB AS $$
DECLARE
  req dice_requests%ROWTYPE;
  d1 INT;
  d2 INT;
  total INT;
  raw INT[];
  v_user UUID := auth.uid();
BEGIN
  SELECT * INTO req FROM dice_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already rolled'; END IF;

  d1 := floor(random() * 20 + 1)::int;
  IF req.advantage OR req.disadvantage THEN
    d2 := floor(random() * 20 + 1)::int;
    IF req.advantage THEN
      raw := ARRAY[GREATEST(d1, d2)];
    ELSE
      raw := ARRAY[LEAST(d1, d2)];
    END IF;
  ELSE
    raw := ARRAY[d1];
  END IF;

  total := raw[1] + p_modifier;
  IF req.mob_advantage THEN
    total := total - 5;
  END IF;

  INSERT INTO dice_rolls (request_id, raw_rolls, modifier, total, is_success,
    rolled_by)
  VALUES (p_request_id, raw, p_modifier, total,
    CASE WHEN req.dc IS NULL THEN NULL ELSE total >= req.dc END,
    v_user);

  UPDATE dice_requests SET status = 'rolled' WHERE id = p_request_id;

  INSERT INTO event_log (session_id, event_type, actor_id, target_crawler_id, message, payload)
  VALUES (req.session_id, 'ROLL', v_user, req.crawler_id,
    req.label || ': rolled ' || total || COALESCE(' vs DC ' || req.dc, ''),
    jsonb_build_object('request_id', p_request_id, 'total', total, 'raw', raw));

  INSERT INTO notifications (session_id, user_id, notification_type, title, body, payload)
  SELECT req.session_id, c.owner_user_id, 'roll',
    'TIRADA',
    req.label || ': ' || total::text,
    jsonb_build_object('request_id', p_request_id, 'total', total, 'raw', raw)
  FROM crawlers c
  WHERE c.id = req.crawler_id AND c.owner_user_id IS NOT NULL;

  RETURN jsonb_build_object('total', total, 'raw', raw, 'success',
    CASE WHEN req.dc IS NULL THEN NULL ELSE total >= req.dc END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply rest
CREATE OR REPLACE FUNCTION apply_rest(
  p_session_id UUID,
  p_rest_type rest_type,
  p_crawler_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  cid UUID;
  c crawlers%ROWTYPE;
BEGIN
  FOREACH cid IN ARRAY p_crawler_ids LOOP
    SELECT * INTO c FROM crawlers WHERE id = cid;
    CASE p_rest_type
      WHEN 'short' THEN
        UPDATE crawlers SET
          hp_boxes_filled = GREATEST(0, c.hp_boxes_filled - GREATEST(stat_modifier(c.con_enhanced), 1) / 2),
          mana_current = LEAST(c.mana_max, c.mana_current + c.mana_max / 2),
          updated_at = now()
        WHERE id = cid;
      WHEN 'long', 'full_day' THEN
        UPDATE crawlers SET
          hp_boxes_filled = 0,
          mana_current = mana_max,
          status = CASE WHEN status = 'downed' THEN 'exploring'::crawler_status ELSE status END,
          unconscious_rounds_remaining = 0,
          updated_at = now()
        WHERE id = cid;
    END CASE;
  END LOOP;

  INSERT INTO rests (session_id, rest_type, applied_by, crawler_ids)
  VALUES (p_session_id, p_rest_type, auth.uid(), p_crawler_ids);

  INSERT INTO event_log (session_id, event_type, actor_id, message)
  VALUES (p_session_id, 'REST', auth.uid(), 'Rest applied: ' || p_rest_type::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile on signup (never block Auth if this fails)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, role, display_name)
  VALUES (
    NEW.id,
    'crawler',
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE attacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE dice_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dice_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements_unlocked ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rests ENABLE ROW LEVEL SECURITY;

-- Helper: is session member
CREATE OR REPLACE FUNCTION is_session_member(p_session_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM session_members WHERE session_id = p_session_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is Dungeon Master of session
CREATE OR REPLACE FUNCTION is_session_dm(p_session_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM sessions s
    JOIN profiles p ON p.id = auth.uid()
    WHERE s.id = p_session_id AND s.created_by = auth.uid() AND p.role = 'dm'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- Sessions
CREATE POLICY sessions_select ON sessions FOR SELECT USING (is_session_member(id));
CREATE POLICY sessions_insert ON sessions FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY sessions_update ON sessions FOR UPDATE USING (is_session_dm(id));

-- Session members
CREATE POLICY session_members_select ON session_members FOR SELECT USING (is_session_member(session_id));
CREATE POLICY session_members_insert ON session_members FOR INSERT WITH CHECK (user_id = auth.uid());

-- Crawlers
CREATE POLICY crawlers_select ON crawlers FOR SELECT USING (is_session_member(session_id));
CREATE POLICY crawlers_dm_all ON crawlers FOR ALL USING (is_session_dm(session_id));

-- Resources
CREATE POLICY resources_select ON resources FOR SELECT USING (is_session_member(session_id));
CREATE POLICY resources_dm_all ON resources FOR ALL USING (is_session_dm(session_id));

-- Item instances
CREATE POLICY items_select ON item_instances FOR SELECT USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND is_session_member(c.session_id))
);
CREATE POLICY items_dm_all ON item_instances FOR ALL USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND is_session_dm(c.session_id))
);
CREATE POLICY items_crawler_update ON item_instances FOR UPDATE USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND c.owner_user_id = auth.uid())
);

-- Generic session-scoped read for remaining tables
CREATE POLICY skills_access ON skills FOR ALL USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND is_session_member(c.session_id))
);
CREATE POLICY attacks_access ON attacks FOR ALL USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND is_session_member(c.session_id))
);
CREATE POLICY modifiers_access ON modifiers FOR ALL USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND is_session_member(c.session_id))
);
CREATE POLICY effects_access ON effects FOR ALL USING (
  EXISTS (SELECT 1 FROM crawlers c WHERE c.id = crawler_id AND is_session_member(c.session_id))
);

CREATE POLICY table_state_select ON table_state FOR SELECT USING (is_session_member(session_id));
CREATE POLICY table_state_dm ON table_state FOR ALL USING (is_session_dm(session_id));

CREATE POLICY map_pins_select ON map_pins FOR SELECT USING (is_session_member(session_id));
CREATE POLICY map_pins_dm ON map_pins FOR ALL USING (is_session_dm(session_id));

CREATE POLICY dice_requests_select ON dice_requests FOR SELECT USING (is_session_member(session_id));
CREATE POLICY dice_requests_dm ON dice_requests FOR INSERT WITH CHECK (is_session_dm(session_id));
CREATE POLICY dice_rolls_select ON dice_rolls FOR SELECT USING (
  EXISTS (SELECT 1 FROM dice_requests dr WHERE dr.id = request_id AND is_session_member(dr.session_id))
);

CREATE POLICY combat_dm ON combat_rounds FOR ALL USING (is_session_dm(session_id));
CREATE POLICY combat_select ON combat_rounds FOR SELECT USING (is_session_member(session_id));

CREATE POLICY achievements_select ON achievements_unlocked FOR SELECT USING (is_session_member(session_id));
CREATE POLICY achievements_dm ON achievements_unlocked FOR ALL USING (is_session_dm(session_id));

CREATE POLICY loot_boxes_select ON loot_boxes FOR SELECT USING (is_session_member(session_id));
CREATE POLICY loot_boxes_dm ON loot_boxes FOR ALL USING (is_session_dm(session_id));

CREATE POLICY event_log_select ON event_log FOR SELECT USING (is_session_member(session_id));
CREATE POLICY event_log_dm ON event_log FOR INSERT WITH CHECK (is_session_dm(session_id));

CREATE POLICY notifications_own ON notifications FOR ALL USING (user_id = auth.uid());

CREATE POLICY rests_select ON rests FOR SELECT USING (is_session_member(session_id));
CREATE POLICY rests_dm ON rests FOR INSERT WITH CHECK (is_session_dm(session_id));

-- Crawler claim / self-update (join flow + HUD)
CREATE POLICY crawlers_claim ON crawlers FOR UPDATE
  USING (is_session_member(session_id) AND (owner_user_id IS NULL OR owner_user_id = auth.uid()))
  WITH CHECK (is_session_member(session_id) AND owner_user_id = auth.uid());

CREATE POLICY session_members_update ON session_members FOR UPDATE
  USING (user_id = auth.uid() OR is_session_dm(session_id));

CREATE POLICY loot_boxes_crawler_open ON loot_boxes FOR UPDATE
  USING (
    assigned_crawler_id IS NULL
    OR EXISTS (
      SELECT 1 FROM crawlers c
      WHERE c.id = assigned_crawler_id AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY notifications_dm_insert ON notifications FOR INSERT
  WITH CHECK (is_session_dm(session_id));

-- Mesa TV: lectura pública de sesiones activas (el código es el secreto)
CREATE POLICY sessions_select_active ON sessions FOR SELECT USING (is_active = true);
CREATE POLICY table_state_public ON table_state FOR SELECT USING (
  EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.is_active)
);
CREATE POLICY map_pins_public ON map_pins FOR SELECT USING (
  EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.is_active)
);
CREATE POLICY resources_public ON resources FOR SELECT USING (
  EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.is_active)
);

-- Realtime (payloads completos en UPDATE)
ALTER TABLE sessions REPLICA IDENTITY FULL;
ALTER TABLE crawlers REPLICA IDENTITY FULL;
ALTER TABLE table_state REPLICA IDENTITY FULL;
ALTER TABLE event_log REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE dice_requests REPLICA IDENTITY FULL;
ALTER TABLE combat_rounds REPLICA IDENTITY FULL;
ALTER TABLE map_pins REPLICA IDENTITY FULL;
ALTER TABLE loot_boxes REPLICA IDENTITY FULL;
ALTER TABLE session_members REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE
  sessions, crawlers, table_state, event_log, notifications,
  dice_requests, combat_rounds, map_pins, loot_boxes, session_members;
