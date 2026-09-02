# Iconografía

## Estilo

- **Line icons** 1.75–2px de stroke, esquinas round, 24px viewport.
- Color default `--cyan-400`.
- No filled dumpy icons (Material filled), no 3D, no emoji como icono de UI.
- Familias recomendadas: Lucide, Phosphor (regular), Tabler. Una sola familia en toda la app.

## Contenedores (de las refs)

| Tipo | Spec | Uso |
|---|---|---|
| Glow disc | 36–40px círculo, fill `rgba(cyan,0.12)`, icono cian, box-shadow glow | Headers de card, KPIs |
| Nav tile | 48×48, radius 14px, well oscuro; icono con glow de color de sección | Rail y bottom nav |
| Slot | 64×64, radius 12px, stroke rareza | Inventario |
| Status pip | 8px círculo + glow | Online, combat, dead |

## Colores de nav (calcar ref 2)

Cada destino tiene un aura propia. No todos cian.

| Destino | Icono sugerido | Glow |
|---|---|---|
| Home / Piso | hexágono o castle | púrpura `#A855F7` |
| Personaje | bust | magenta `#E879F9` |
| Inventario | backpack / grid | cian `#00D4FF` |
| Notificaciones | bell | naranja `#F97316` |
| Log | scroll-text | teal `#2DD4BF` |
| Master: Recursos | database | cian |
| Master: Crawlers | users | magenta |
| Master: Sesión | play / zap | naranja |
| Master: World | map | gold |

Icono activo: glow más fuerte + fill sutil del mismo color al 12%. Inactivo: `--text-3`, sin glow.

## Rareza en slots

El icono del objeto es simple. La **rareza la dice el borde y el glow**, no el icono.

- Common: stroke blanco 10% opacidad, sin glow.
- Uncommon → Celestial: ver tabla en `02-sistema-de-color.md`.
- Item nuevo / unclaimed: pip cian en esquina + pulse lento.

## Semántica de notificación (icono + color)

| Tipo | Icono | Color |
|---|---|---|
| Reward | gift / sparkles | naranja–oro |
| Penalty | alert-octagon / skull | `--danger` |
| Achievement | medal | gold |
| System | terminal / info | cian |
| Combat | swords | rojo |
| Level up | chevrons-up | magenta |
| Death | x-octagon | rojo + flash |
| Revival | heart-pulse | verde |
| Assignment | send | cian |
| Whisper / Master note | message | púrpura |

## Decoración

- Cluster 2×2 dots: menú de widget, no icono de contenido.
- Chevrons cian para “ver más”.
- No ilustraciones clipart. Retratos de crawler: foto/art enmascarado, no avatares genéricos de 8-bit.

## Tamaños

| Contexto | px |
|---|---|
| Inline en texto | 14 |
| UI / nav | 20–22 |
| Card header | 18–20 |
| Empty state | 40, stroke 1.5, opacidad 0.5 |
| Cinematic reward | 56, con glow |
