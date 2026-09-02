# Pantallas y roles

Fuente: `Design/09-pantallas.md`, `Design/10-arquitectura-de-informacion.md`.

## MUST — dos shells

**Master:** desktop-first 1440. Topbar + icon rail. Densidad alta (tablas, KPIs, log). Acento cian.

**Crawler:** HUD. Móvil-first con bottom nav de tiles con glow. Densidad media. Acento magenta en identidad, naranja en loot.

No reutilizar el shell Master para el jugador “más simple”. Son productos visuales distintos sobre el mismo sistema de tokens.

## MUST — permisos de UI

Si el rol no puede, el control **no se renderiza**. Prohibido botón disabled “solo Master”.

Nav Crawler: Home, Personaje, Inventario, Notificaciones, Log, Settings.  
Nav Master: Session, Crawlers, Recursos, World/Pisos, Notificaciones, Log, Settings.

## MUST — pantallas canónicas

Al crear una ruta, mapear a una de estas. Si no encaja, componer con GlassPanel; no inventar un layout SaaS.

1. Login (panel 440, tiles de rol, CTA según rol)
2. Master dashboard (media-kit: KPIs + chart + donut + log)
3. Recursos lista / editor / preview jugador
4. Asignación (qué, quién, modo reward/penalty/silent)
5. Crawlers (grid de portraits + mini barras)
6. Character sheet (portrait, barras, 6 stats KPI, lore, effects)
7. Inventario (grid slots + detalle)
8. Notificaciones lista
9. Reward cinematic / Penalty cinematic
10. Event log (Master global / Crawler personal)
11. Player home HUD
12. Settings (sin light mode)

## SHOULD

- Page header: breadcrumb `SYSTEM / SECCIÓN / ENTIDAD` + título Orbitron + acciones a la derecha.
- Loading: skeletons con radius heredado, no spinner de página.
- Dead crawler: HUD desaturado + banner `YOU ARE DEAD`.
- Master dashboard vacío: copy del Sistema + CTA iniciar piso (`btn-session`).

## NEVER

- Llamar Users, Admin, Inbox, Feed, Profile en la nav. Usar Crawlers, Master, The System, Event Log, Character Sheet.
- Meter un formulario de 20 campos en el HUD del jugador.
- Mostrar log global omnisciente al crawler.
- Añadir marketing, onboarding de 5 pasos, o paywall “Upgrade Pro” literal (el botón outline neón es un **estilo**, no un plan SaaS).

## Flujo al implementar una feature

1. ¿Es Master, Crawler o ambos?
2. ¿Qué pantalla canónica?
3. ¿Qué componentes de `08`?
4. ¿Hay reward/penalty/log? Encadenar según `04-notificaciones-logs.md`.
5. Empty / loading / error / populated.
