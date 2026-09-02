<div align="center">

<img src="public/icons/icon.svg" width="88" alt="Crawler OS" />

**SYSTEM / SESSION TOOL / CARLRPG**

# CRAWLER OS

*La Tierra ya no es un planeta. Es un dungeon televisado. The System lleva la cuenta, reparte el loot y cobra las multas. Tú eres un crawler: una hoja holográfica, un inventario y una audiencia que espera verte morir con estilo. Esto es el visor que te inyectaron al cruzar el primer piso.*

[![The System](https://img.shields.io/badge/The_System-00D4FF?style=for-the-badge&labelColor=05060D)](#roles)
[![Crawler HUD](https://img.shields.io/badge/Crawler_HUD-E879F9?style=for-the-badge&labelColor=05060D)](#roles)
[![Reward](https://img.shields.io/badge/Loot-F97316?style=for-the-badge&labelColor=05060D)](#roles)

La IA dirige la mesa. Los crawlers viven el HUD. La TV muestra el dungeon.

</div>

---

## Roles

| | Ruta | Qué ve |
|---|---|---|
| **La IA** | `/ia` | Control total. Recursos, crawlers, dados, loot, penalizaciones. Acento **cian**. |
| **Crawler** | `/crawler` | Su visor. Hoja, inventario, notificaciones, log personal. Acento **magenta**. |
| **Mesa TV** | `/table/[code]` | Vista compartida, sin nav. El dungeon en la tele. |

El crawler no ve controles de Master. Ni deshabilitados.

## Stack

Next.js 15 · TypeScript · Tailwind · **Supabase** (Auth, Postgres, Realtime) · **Vercel**

Void `#05060D` · Sistema `#00D4FF` · Crawler `#E879F9` · Loot `#F97316` · Penalty `#FF3B5C`

## Jack In

```bash
npm install
```

Crea `.env.local` (no lo subas a git):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm run dev
```

### Supabase

1. Proyecto en [supabase.com](https://supabase.com)
2. SQL Editor: `supabase/migrations/20260302120000_initial_schema.sql` (una vez)
3. Realtime en `sessions`, `crawlers`, `table_state`, `event_log`, `notifications`, `dice_requests`, `combat_rounds`, `map_pins`
4. Auth → Email: desactivar confirmación para testear
5. Auth → URL Configuration: Site URL + redirects

### Scripts

| Comando | |
|---|---|
| `npm run dev` | desarrollo |
| `npm run build` | producción |
| `npm run db:push` | aplicar migraciones |
| `npm run db:types` | tipos TS |

## Deploy

Importar el repo en [Vercel](https://vercel.com). Pegar las env vars. Poner la URL de Vercel en los redirects de Supabase. Redeploy.

## Spec

| | |
|---|---|
| [Design/](Design/) | HUD, tokens, pantallas |
| [Rules/](Rules/) | Contrato para agentes |
| [docs/](docs/) | CarlRPG — local, no en git |

---

<div align="center">

*The System is not angry. The System is disappointed.*  
*And also angry.*

</div>
