# Crawler OS — Arquitectura y funcionamiento

> Documento de referencia para que cualquier agente o desarrollador entienda rápidamente cómo está construida la aplicación.

---

## 1. ¿Qué es Crawler OS?

Crawler OS es una **herramienta de sesión en tiempo real** para el juego de rol CarlRPG. Funciona como un HUD digital que conecta a dos tipos de usuario:

- **Dungeon Master (DM):** controla la sesión, gestiona combate, dados, recursos, mapa y crawlers.
- **Crawlers (jugadores):** ven su ficha de personaje, inventario, habilidades, notificaciones y tiran dados.

Además existe una vista **Mesa TV** (`/table/[code]`) que proyecta en pantalla lo que el DM decide mostrar (mapa, monstruo, texto, imagen).

Todo se sincroniza en **tiempo real** mediante Supabase Realtime (WebSockets sobre PostgreSQL).

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Lenguaje** | TypeScript (strict) |
| **UI** | React 19, Tailwind CSS 4, Framer Motion |
| **Iconos** | Lucide React |
| **Validación** | Zod |
| **Base de datos** | PostgreSQL (via Supabase) |
| **Auth** | Supabase Auth (email + magic link en dev) |
| **Realtime** | Supabase Realtime (suscripciones a tablas) |
| **Backend** | API Routes de Next.js + funciones SQL (RPC) en Supabase |
| **Dev local** | Supabase CLI (Docker) + `npm run dev` |

No hay backend separado ni colas. Toda la lógica de negocio pesada (daño, descanso, dados, otorgar recursos) vive en **funciones PostgreSQL** (`SECURITY DEFINER`) que se llaman via `.rpc()`.

---

## 3. Estructura de carpetas

```
crawler-os/
├── docs/                        # Documentación
├── public/                      # Assets estáticos (manifest, iconos)
├── scripts/                     # setup-local.mjs (bootstrap DB + .env)
├── supabase/
│   ├── config.toml              # Config de Supabase CLI
│   ├── seed.sql                 # Datos iniciales (DM, crawlers de prueba, sesión FLOOR-TEST)
│   └── migrations/
│       ├── 20260302120000_initial_schema.sql   # Schema completo
│       ├── 20260903120000_fix_auth_profile_trigger.sql
│       ├── 20260903130000_skill_catalog.sql
│       └── 20260903140000_skill_catalog_dm.sql
└── src/
    ├── middleware.ts             # Refresca sesión Supabase en cada request
    ├── app/                     # App Router (páginas y API)
    │   ├── layout.tsx           # Layout raíz (HTML, globals.css)
    │   ├── page.tsx             # Raíz → redirige a /login o /dm o /crawler
    │   ├── login/page.tsx       # Pantalla de login
    │   ├── join/page.tsx        # Unirse a sesión con código
    │   ├── api/
    │   │   ├── enter/route.ts           # POST — Login dev (crea usuario + sesión)
    │   │   ├── lobby/crawlers/route.ts  # GET — Lista crawlers disponibles
    │   │   └── dm/skill-catalog/route.ts # GET/POST — Catálogo de habilidades
    │   ├── dm/                  # Todas las páginas del Dungeon Master
    │   │   ├── page.tsx         # Dashboard DM
    │   │   ├── layout.tsx       # Layout DM (nav, guards)
    │   │   ├── crawlers/        # Gestión de crawlers
    │   │   ├── dice/            # Solicitar tiradas
    │   │   ├── table/           # Controlar la Mesa TV
    │   │   ├── resources/       # CRUD de recursos (items, logros, mapas…)
    │   │   ├── skills/          # Catálogo de habilidades
    │   │   ├── world/           # Fase de sesión, piso, descansos
    │   │   ├── log/             # Log de eventos
    │   │   ├── notifications/   # Notificaciones del DM
    │   │   ├── settings/        # Ajustes de sesión
    │   │   └── mobile/          # Vista DM compacta para móvil
    │   ├── crawler/             # Todas las páginas del Crawler
    │   │   ├── page.tsx         # Dashboard crawler
    │   │   ├── layout.tsx       # Layout crawler (nav, guards)
    │   │   ├── sheet/           # Ficha de personaje
    │   │   ├── inventory/       # Inventario
    │   │   ├── loot/            # Cajas de botín
    │   │   ├── skills/          # Habilidades del crawler
    │   │   ├── table/           # Vista Mesa desde el crawler
    │   │   ├── notifications/   # Notificaciones
    │   │   └── settings/        # Ajustes
    │   └── table/[code]/        # Mesa TV pública (sin login)
    ├── components/
    │   ├── ui/                  # Componentes genéricos (Button, Input, GlassPanel)
    │   ├── layout/              # Nav, FloatingUtilityMenu
    │   └── hud/                 # Componentes del HUD de juego
    │       ├── CharacterSheet.tsx
    │       ├── DiceOverlay.tsx
    │       ├── EventLog.tsx
    │       ├── HealthBoxes.tsx
    │       ├── InventorySlot.tsx
    │       ├── NotificationInbox.tsx
    │       ├── PartyAvatarRail.tsx
    │       ├── SceneChat.tsx
    │       ├── StatKPI.tsx
    │       ├── TableCanvas.tsx
    │       ├── CinematicOverlay.tsx
    │       └── HudTooltip.tsx
    ├── hooks/
    │   ├── useSession.ts        # Auth + sesión activa
    │   ├── useNotifications.ts  # Suscripción realtime a notificaciones
    │   └── useUnreadNotifications.ts
    ├── lib/
    │   ├── types.ts             # Tipos TypeScript (mirror del schema SQL)
    │   ├── rules.ts             # Reglas de CarlRPG (stats, DC, combate, dados)
    │   ├── skills.ts            # Lógica de habilidades
    │   ├── utils.ts             # Utilidades generales
    │   ├── copy.ts              # Textos / copy del juego
    │   ├── dev.ts               # Helpers de desarrollo
    │   └── supabase/
    │       ├── client.ts        # Cliente browser (singleton)
    │       ├── server.ts        # Cliente server-side (cookies)
    │       ├── admin.ts         # Cliente service_role (sin RLS)
    │       └── middleware.ts    # Refresh de sesión Auth
    └── styles/
        ├── globals.css          # Estilos globales + tema oscuro bokeh
        └── tokens.css           # Design tokens (colores de rareza, etc.)
```

---

## 4. Modelo de datos (PostgreSQL)

### Enums clave

| Enum | Valores |
|---|---|
| `user_role` | `dm`, `crawler` |
| `session_phase` | `exploration`, `combat_1`–`combat_5`, `rest`, `paused` |
| `crawler_status` | `exploring`, `combat`, `downed`, `dead`, `afk` |
| `resource_kind` | `item`, `achievement`, `map`, `monster`, `npc`, `box`, `buff`, `debuff`, `quest`, `floor`, `skill_template` |
| `rarity` | `common`, `uncommon`, `rare`, `epic`, `legendary`, `celestial` |
| `dice_roll_kind` | `opposed`, `unopposed`, `stat_check`, `attack`, `scaled` |

### Tablas principales

```
profiles ──────────── auth.users (1:1, trigger on_auth_user_created)
    │
sessions ─────────── code único tipo "FLOOR-XXXX"
    │                  phase, floor_number, is_active
    │
session_members ──── user_id + session_id + crawler_id (N:M)
    │
crawlers ─────────── Ficha de personaje completa
    │                  5 stats base + 5 enhanced (recalc via modifiers)
    │                  HP boxes (0-10), mana, DR, evade, move
    │                  Campos de lore (trauma, popularidad, mascotas…)
    ├── skills ────── Habilidades (tipo, rango, stat vinculado, checks)
    ├── attacks ───── Hasta 3 ataques por crawler
    ├── modifiers ─── Modificadores temporales a stats
    ├── effects ───── Buffs/debuffs activos
    └── item_instances ── Inventario (resource_id + cantidad + slot)

resources ─────────── Catálogo del DM (items, mapas, monstruos, logros…)
    │                   kind + rarity + payload JSON
    │
table_state ──────── Estado de la Mesa TV (qué se muestra, zoom, pan)
map_pins ─────────── Pines en el mapa
dice_requests ─────── Solicitudes de tirada (DM → crawler)
dice_rolls ────────── Resultado de cada tirada
combat_rounds ─────── Rondas de combate activas
event_log ─────────── Log de todos los eventos de la sesión
notifications ─────── Notificaciones push por usuario
loot_boxes ────────── Cajas de botín (sealed → opening → opened)
achievements_unlocked ─ Logros desbloqueados por crawler
rests ─────────────── Registro de descansos aplicados
```

### Funciones SQL importantes (llamadas via `.rpc()`)

| Función | Qué hace |
|---|---|
| `create_game_session(name)` | Crea sesión con código único, table_state, añade al DM como miembro |
| `join_session_by_code(code)` | Une al crawler, le asigna el primer personaje sin dueño |
| `grant_resource(resource_id, crawler_ids[], mode)` | Otorga item/logro + genera evento + notificación |
| `submit_dice_roll(request_id, modifier)` | Tira dados server-side, registra resultado + evento |
| `apply_damage(crawler_id, damage, type)` | Calcula cajas de HP a rellenar según CON, marca downed si llega a 10 |
| `apply_rest(session_id, type, crawler_ids[])` | Restaura HP/mana según tipo de descanso |
| `recalc_crawler_enhanced(crawler_id)` | Recalcula stats enhanced sumando modifiers activos |
| `stat_modifier(stat)` | `floor((stat - 10) / 2)` |
| `compute_dc(kind, floor, antagonist_mod)` | Calcula DC según tipo de tirada y piso |

---

## 5. Seguridad (RLS)

Todas las tablas tienen **Row Level Security** activado. Principios:

- **Lectura:** solo miembros de la sesión (`is_session_member()`).
- **Escritura:** el DM de la sesión (`is_session_dm()`) puede escribir en casi todo.
- **Crawlers:** solo pueden actualizar su propio crawler y marcar notificaciones como leídas.
- **Mesa TV:** lectura pública para sesiones activas (el código de sesión actúa como secreto).
- **Notificaciones:** cada usuario solo ve las suyas.

---

## 6. Tiempo real

Las siguientes tablas emiten cambios via Supabase Realtime (con `REPLICA IDENTITY FULL` para payloads completos en UPDATE):

`sessions`, `crawlers`, `table_state`, `event_log`, `notifications`, `dice_requests`, `combat_rounds`, `map_pins`, `loot_boxes`, `session_members`

El frontend se suscribe con `supabase.channel().on('postgres_changes', ...)` para actualizar la UI sin recargar.

---

## 7. Flujo de autenticación

### Producción
Login por email + password contra Supabase Auth. Al registrarse, un trigger (`on_auth_user_created`) crea automáticamente un registro en `profiles`.

### Desarrollo local (`NEXT_PUBLIC_DEV_LOGIN=true`)
La pantalla de login muestra botones de acceso rápido. Al pulsar:
1. `POST /api/enter` con `{ role: "dm" }` o `{ crawlerId: "..." }`.
2. El endpoint usa la `service_role` key para crear/encontrar el usuario y generar un magic link.
3. Se verifica el OTP server-side y se setea la cookie de sesión.
4. Redirect a `/dm` o `/crawler`.

---

## 8. Flujo principal de uso

```
1. DM crea sesión → genera código "FLOOR-XXXX"
2. Crawlers se unen con el código → se les asigna un personaje
3. Sesión en fase "exploration"
   ├── DM proyecta mapas/texto en Mesa TV
   ├── DM otorga items/logros a crawlers (grant_resource)
   ├── DM solicita tiradas de dado → crawlers tiran
   └── Todo se sincroniza en realtime
4. Combate → fases 1-5 (declaraciones → reacciones → resolución → ataques → limpieza)
   ├── DM aplica daño (apply_damage)
   ├── Crawlers pueden ser "downed" si llenan 10 HP boxes
   └── Combate resuelve por rondas
5. Descanso → restaura HP/mana según tipo (short/long/full_day)
6. Siguiente piso → floor_number++
```

---

## 9. Reglas del motor CarlRPG (src/lib/rules.ts)

- **Stats:** STR, INT, CON, DEX, CHA. Modificador = `floor((stat - 10) / 2)`.
- **HP:** 10 cajas. Cada caja absorbe `max(CON_mod, 1)` puntos de daño. 10 cajas llenas = downed.
- **Mana:** máximo = INT enhanced.
- **DC (Difficulty Class):** base 10 + floor_number (varía según tipo de tirada).
- **Combate:** 5 fases por ronda.
- **Tipos de daño:** acid, necrotic, electric, fire, ice, sonic, holy, slashing, bludgeoning, psychic, force, poison, piercing.
- **Gear slots:** head, torso, arms, hands, legs, feet, accessory.
- **Rareza:** common → uncommon → rare → epic → legendary → celestial.

---

## 10. API Routes

| Ruta | Método | Descripción |
|---|---|---|
| `/api/enter` | POST | Login de desarrollo (crea usuario, inicia sesión) |
| `/api/lobby/crawlers` | GET | Lista crawlers disponibles para elegir en login |
| `/api/dm/skill-catalog` | GET/POST | CRUD del catálogo de habilidades del DM |

El grueso de las operaciones de datos se hace directamente desde el cliente con `supabase.from('tabla')` o `supabase.rpc('funcion')`, protegido por RLS.

---

## 11. Cómo levantar el proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Arrancar Supabase local (requiere Docker)
npm run setup:local    # Primera vez: crea .env.local + DB + seed

# 3. Arrancar la web
npm run dev            # → http://localhost:3000
```

### Scripts útiles

| Script | Qué hace |
|---|---|
| `npm run dev` | Arranca Next.js con Turbopack |
| `npm run setup:local` | Bootstrap completo (Supabase start + migraciones + seed + .env.local) |
| `npm run db:start` | Solo arranca los contenedores de Supabase |
| `npm run db:stop` | Para los contenedores |
| `npm run db:reset` | Borra y recrea la DB con migraciones + seed |
| `npm run db:push` | Aplica migraciones pendientes |
| `npm run db:types` | Genera tipos TypeScript desde el schema |

---

## 12. Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de Supabase (local: `http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (salta RLS, solo server-side) |
| `NEXT_PUBLIC_APP_URL` | URL de la app (`http://localhost:3000`) |
| `NEXT_PUBLIC_DEV_LOGIN` | `true` para login rápido sin contraseña |

---

## 13. Convenciones de código

- **Idioma del código:** inglés (nombres de variables, tipos, funciones).
- **Idioma del UI/copy:** español (textos visibles, mensajes, labels).
- **Estilo visual:** tema oscuro "sci-fi/dungeon" con efecto bokeh, paneles de cristal (`GlassPanel`), colores neón.
- **Componentes:** funcionales con hooks. Sin state management global (todo viene de Supabase queries + realtime).
- **Rutas:** App Router de Next.js con layouts anidados (`/dm/layout.tsx`, `/crawler/layout.tsx`).
- **Supabase clients:** `client.ts` (browser), `server.ts` (server components/actions), `admin.ts` (service_role, solo API routes).
