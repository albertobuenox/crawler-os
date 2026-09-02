# Crawler OS

Herramienta de mesa en tiempo real para **CarlRPG** (Dungeon Crawler Carl). La IA administra la sesión; los Crawlers usan un HUD holográfico.

## Stack

- **Next.js 15** + TypeScript + Tailwind
- **Supabase** (Auth, Postgres, Realtime, Storage, Edge Functions)
- **Vercel** (deploy frontend)

## Documentación del proyecto

| Carpeta | Contenido |
|---|---|
| [Design/](Design/) | Sistema visual Crawler OS |
| [Rules/](Rules/) | Reglas de estilo para agentes |
| [docs/](docs/) | Reglas CarlRPG (local, PDFs no en git) |

## Setup local

```bash
npm install
cp .env.example .env.local
# Rellenar credenciales Supabase
npm run dev
```

## Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. `npx supabase link --project-ref YOUR_REF`
3. `npm run db:push`
4. Habilitar Realtime en tablas: `sessions`, `crawlers`, `table_state`, `event_log`, `notifications`, `dice_requests`, `combat_rounds`

## Scripts

- `npm run dev` — desarrollo
- `npm run build` — producción
- `npm run db:push` — aplicar migraciones
- `npm run db:types` — regenerar tipos TS

## Roles

- **La IA** — `/ia/*` — control total de sesión
- **Crawler** — `/crawler/*` — HUD del jugador
- **Mesa TV** — `/table/[code]` — vista compartida sin nav

## Deploy (Vercel)

Importar repo, añadir env vars de `.env.example`, configurar Auth redirect URLs en Supabase.
