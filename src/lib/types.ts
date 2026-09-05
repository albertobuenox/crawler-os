export type UserRole = "dm" | "crawler";

export type StatKey = "str" | "int" | "con" | "dex" | "cha";

export type SessionPhase =
  | "exploration"
  | "combat_1"
  | "combat_2"
  | "combat_3"
  | "combat_4"
  | "combat_5"
  | "rest"
  | "paused";

export type CrawlerStatus = "exploring" | "combat" | "downed" | "dead" | "afk";

export type ResourceKind =
  | "item"
  | "achievement"
  | "map"
  | "monster"
  | "npc"
  | "box"
  | "buff"
  | "debuff"
  | "quest"
  | "floor"
  | "skill_template";

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "celestial";

export type LootBoxRarity =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "legendary"
  | "celestial";

export type EventType =
  | "REWARD"
  | "PENALTY"
  | "SYSTEM"
  | "COMBAT"
  | "ROLL"
  | "ACHIEVEMENT"
  | "REST";

export type NotificationType =
  | "reward"
  | "penalty"
  | "system"
  | "combat"
  | "roll"
  | "achievement"
  | "loot_box";

export type DiceRollKind =
  | "opposed"
  | "unopposed"
  | "stat_check"
  | "attack"
  | "scaled";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
}

export interface GameSession {
  id: string;
  code: string;
  name: string;
  floor_number: number;
  phase: SessionPhase;
  created_by: string;
  is_active: boolean;
  skill_advancement_hours: number;
  skill_timer_running?: boolean;
  skill_timer_elapsed_seconds?: number;
  skill_timer_started_at?: string | null;
  skill_advancement_open?: boolean;
}

export interface Crawler {
  id: string;
  session_id: string;
  owner_user_id: string | null;
  name: string;
  race: string | null;
  gender_pronouns: string | null;
  level: number;
  crawler_number: string | null;
  class_name: string | null;
  floor: number;
  size: string | null;
  deity: string | null;
  portrait_url: string | null;
  str_base: number;
  int_base: number;
  con_base: number;
  dex_base: number;
  cha_base: number;
  str_enhanced: number;
  int_enhanced: number;
  con_enhanced: number;
  dex_enhanced: number;
  cha_enhanced: number;
  hp_boxes_filled: number;
  mana_current: number;
  mana_max: number;
  dr_total: number;
  evade_total: number;
  move: number;
  step: number;
  armor: string | null;
  ai_favor_remaining: number;
  past_trauma: string | null;
  popularity: string | null;
  loose_ends: string | null;
  regrets: string | null;
  notes: string | null;
  personal_space: Record<string, unknown>;
  amenities: unknown[];
  pet: Record<string, unknown>;
  mount_vehicle: Record<string, unknown>;
  clubs: unknown[];
  sponsors: unknown[];
  racial_abilities: unknown[];
  class_abilities: unknown[];
  things_killed: unknown[];
  analyze_intel: Record<string, unknown>;
  status: CrawlerStatus;
  unconscious_rounds_remaining: number;
  avatar_emotion?: string | null;
}

export type ItemCategory = "equipment" | "consumable" | "misc";

export type EquipSlot =
  | "head"
  | "cloak"
  | "chest"
  | "gloves"
  | "boots"
  | "hand_right"
  | "hand_left"
  | "accessory";

export interface EquipmentBonus {
  id: string;
  text: string;
}

export interface Resource {
  id: string;
  session_id: string;
  kind: ResourceKind;
  name: string;
  slug: string | null;
  rarity: Rarity;
  description: string | null;
  system_copy: string | null;
  icon_url: string | null;
  payload: Record<string, unknown>;
  loot_rarity?: LootBoxRarity | null;
  loot_floor?: number | null;
  is_unique?: boolean;
  item_category?: ItemCategory | null;
  equip_slot?: EquipSlot | null;
  source_loot_rarity?: LootBoxRarity | null;
  source_loot_floor?: number | null;
}

export interface ItemInstance {
  id: string;
  crawler_id: string;
  resource_id: string;
  quantity: number;
  equipped_slot: string | null;
  hotlist_index: number | null;
  notes: string | null;
  source_loot_rarity?: LootBoxRarity | null;
  source_loot_floor?: number | null;
  resource?: Resource;
}

export type SkillKind = "ataque" | "defensa" | "apoyo" | "destreza";

export interface SkillCatalogEntry {
  id: string;
  slug: string;
  name: string;
  description?: string;
  kind?: SkillKind;
  thumb_url?: string | null;
  roll_min: number;
  roll_max: number;
  page_ref: number;
  animal_only: boolean;
}

export interface Skill {
  id: string;
  crawler_id: string;
  catalog_id: string | null;
  name: string;
  skill_type: "attack" | "spell" | "utility" | "passive";
  rank: number;
  linked_stat: StatKey;
  check_marks: number;
  notes: string | null;
  created_at?: string;
  skill_catalog?: SkillCatalogEntry | null;
}

export interface TableState {
  id: string;
  session_id: string;
  shown_type: "none" | "map" | "item" | "monster" | "text" | "image";
  resource_id: string | null;
  title: string | null;
  body_text: string | null;
  image_url: string | null;
  zoom: number;
  pan_x: number;
  pan_y: number;
  show_grid: boolean;
  canvas?: SceneCanvasDoc | Record<string, unknown> | null;
  admin_in_room?: boolean;
}

export type SceneTokenKind = "player" | "enemy";

export interface SceneMapLayer {
  id: string;
  image_url: string;
  name: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  natural_w: number;
  natural_h: number;
  z: number;
}

export interface SceneToken {
  id: string;
  kind: SceneTokenKind;
  label: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  sprite_url: string | null;
  crawler_id: string | null;
  resource_id: string | null;
  mob_id: string | null;
  z: number;
}

export interface SceneCanvasDoc {
  maps: SceneMapLayer[];
  tokens: SceneToken[];
  pan_x: number;
  pan_y: number;
  zoom: number;
  updated_at: string;
}

export interface MapPin {
  id: string;
  session_id: string;
  label: string;
  pin_type: string;
  x: number;
  y: number;
  color: string;
  crawler_id: string | null;
}

export type MinimapTokenKind = "player" | "npc" | "enemy" | "pet" | "minion";
export type MinimapFixtureKind = "door" | "obstacle" | "stairs";
export type MinimapStrokeTool = "draw" | "wall";

export interface MinimapPoint {
  x: number;
  y: number;
}

export interface MinimapToken {
  id: string;
  kind: MinimapTokenKind;
  label: string;
  x: number;
  y: number;
  crawler_id: string | null;
}

export interface MinimapStroke {
  id: string;
  tool: MinimapStrokeTool;
  points: MinimapPoint[];
}

export interface MinimapFixture {
  id: string;
  kind: MinimapFixtureKind;
  x: number;
  y: number;
  rotation: number;
}

export interface MinimapDoc {
  session_id: string;
  tokens: MinimapToken[];
  strokes: MinimapStroke[];
  fixtures: MinimapFixture[];
  updated_at: string;
}

export interface DiceRequest {
  id: string;
  session_id: string;
  crawler_id: string | null;
  roll_kind: DiceRollKind;
  label: string;
  dc: number | null;
  advantage: boolean;
  disadvantage: boolean;
  mob_advantage: boolean;
  status: "pending" | "rolled" | "cancelled";
}

export interface DiceRoll {
  id: string;
  request_id: string;
  raw_rolls: number[];
  modifier: number;
  total: number;
  is_success: boolean | null;
}

export interface EventLogEntry {
  id: string;
  session_id: string;
  event_type: EventType;
  message: string;
  target_crawler_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  session_id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  cinematic_shown: boolean;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CombatRound {
  id: string;
  session_id: string;
  round_number: number;
  phase: SessionPhase;
  mob_declarations: unknown[];
  is_active: boolean;
}

export interface LootBox {
  id: string;
  session_id: string;
  resource_id: string;
  assigned_crawler_id: string | null;
  status: "sealed" | "opening" | "opened";
  contents: unknown[];
  loot_rarity?: LootBoxRarity | null;
  loot_floor?: number | null;
}

export interface Effect {
  id: string;
  crawler_id: string;
  name: string;
  effect_kind: "internal" | "external" | "debuff";
  is_stackable: boolean;
  payload: Record<string, unknown>;
}

export interface StatModifierRow {
  id: string;
  crawler_id: string;
  source_type: string;
  source_id: string | null;
  target_field: string;
  value: number;
  expires_at: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  author_user_id: string;
  author_name: string;
  author_role: UserRole;
  author_crawler_id: string | null;
  channel: string;
  body: string;
  created_at: string;
}

export type MobType =
  | "beast"
  | "undead"
  | "construct"
  | "humanoid"
  | "aberration"
  | "elemental"
  | "vermin"
  | "dragon"
  | "fiend"
  | "plant";

export interface DmNotificationDraft {
  id: string;
  session_id: string;
  notification_type: NotificationType;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DmNote {
  id: string;
  session_id: string;
  title: string;
  body: string;
  is_reminder: boolean;
  created_at: string;
  updated_at: string;
}

export interface DmChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DmChecklist {
  id: string;
  session_id: string;
  title: string;
  is_pinned: boolean;
  items: DmChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface DmMob {
  id: string;
  session_id: string;
  name: string;
  level: number;
  mob_type: MobType;
  sprite_url: string | null;
  created_at: string;
  updated_at: string;
}

export const CHAT_CHANNEL_ALL = "all";
export const CHAT_BODY_MAX = 500;

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "var(--rarity-common)",
  uncommon: "var(--rarity-uncommon)",
  rare: "var(--rarity-rare)",
  epic: "var(--rarity-epic)",
  legendary: "var(--rarity-legendary)",
  celestial: "var(--rarity-celestial)",
};

export const STAT_LABELS: Record<StatKey, string> = {
  str: "STR",
  int: "INT",
  con: "CON",
  dex: "DEX",
  cha: "CHA",
};
