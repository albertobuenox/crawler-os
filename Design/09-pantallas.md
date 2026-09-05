# Pantallas

Cada pantalla: propósito, layout, componentes, estados vacíos y errores. Calcar densidad y composición de las referencias.

---

## P0. Boot / Splash

- Void + logo “THE SYSTEM” Orbitron + ring loader cian.
- 1.2s máximo. No lore dump.

---

## P1. Login

**Objetivo:** autenticar y elegir rol.

Layout: canvas bokeh intenso (ref 2) + un GlassPanel 440px centrado.

Contenido:

1. Marca: `THE SYSTEM` + subtítulo cian `CRAWLER OS`.
2. Segmented Master / Crawler (componente 17).
3. Campo identidad (email o handle).
4. Campo passphrase (password).
5. CTA: si Master → pill púrpura-azul “JACK IN”. Si Crawler → fill naranja-rosa “ENTER THE DUNGEON”.
6. Link ghost “sesión de mesa / código de sala”.

Estados: loading (ring en el botón), error (border danger + frase del Sistema), éxito (flash cyan y fade al shell).

No OAuth buttons de Google coloridos. Si hay OAuth, ghost outline cyan.

---

## P2. Código de sesión (opcional post-login)

Input mono grande para `FLOOR-XXXX`. Confirmar outline cyan.

---

## P3. Master — Dashboard

Calcar **ref 1 Media Kit**.

- Topbar + rail.
- Título `SESSION CONTROL` + CTA “INICIAR PISO” (pill púrpura-azul).
- Fila KPI: Crawlers vivos · Nivel medio · Cajas abiertas · Amenaza del piso (donut o número).
- Col 8: line chart “Amenaza / XP otorgada / daños” dual cyan+magenta (ref 2).
- Col 4: donut “estado party” (vivos / downed / dead).
- Abajo: log compacto 6 filas + “Campaign Performance” = loot otorgado, penalizaciones, kills.

Empty: “No hay sesión activa. El dungeon está aburrido.” + CTA iniciar.

---

## P4. Master — Recursos (índice)

Tabla densa filtrable. Tabs: Items · Equipo · Consumibles · Monstruos · NPCs · Pisos · Quests · Logros · Cajas · Tablas de loot · Estados.

Toolbar: search, filter rareza/piso, botón fill “NUEVO RECURSO”.

Row click → P5.

---

## P5. Master — Editor de recurso

Split: form 7 cols + preview glass 5 cols (cómo lo verá el jugador: slot, tooltip, rareza).

Campos: nombre, slug mono, tipo, rareza, descripción (voz Sistema), stats, tags, icono, flags (soulbound, quest-item…).

Footer: Ghost cancel · Outline guardar · Fill “Asignar a crawler”.

---

## P6. Master — Asignación

Modal o página corta.

- Qué se asigna (card preview).
- A quién: party completa / crawlers concretos / piso (todos los presentes).
- Cómo llega: Reward cinematic · Penalty cinematic · Silencioso (solo log).
- Nota del Sistema (copy opcional, placeholder sarcástico).
- Confirmar: Fill naranja si reward, Danger si penalty, Outline si silent.

---

## P7. Master — Crawlers

Grid de portraits (ref 2 user stats, repetido). Cada card:

- Portrait + LV + clase.
- Mini barras HP/MP/STA.
- Estado (exploring, combat, downed, dead, AFK).
- Acciones: Hoja · Inventario · Grant · Fine.

---

## P8. Hoja de personaje (Master y Jugador)

Misma anatomía; Master tiene botones de edición.

Layout tipo ref 2 (stats izq) + ref 1 (about + KPIs):

```
[ Portrait 120  ]  NOMBRE          LV 12   Raza / Clase
                   HP ████████░░  142/200
                   MP ██████░░░░
                   STA █████████░

[ STR 18 ] [ STA 14 ] [ AGI 16 ] [ INT 11 ] [ CHA 22 ] [ PER 13 ]
            ↑ KPI pattern, números cian

Well “About / Lore”
Well “Skills / Feats” chips
Well “Active effects” buff verde / debuff rojo
Well “Objectives” del piso
```

Jugador: sin editar stats. Puede usar consumible (CTA outline).  
Master: lápiz en cada bloque; “matar / revivir / cambiar piso”.

---

## P9. Inventario

- Tabs: All · Equipped · Consumables · Quest · Junk.
- Grid de slots (componente 8).
- Panel derecho (desktop) o bottom sheet (móvil): detalle del item seleccionado, lore, acciones Equip / Use / Drop (Drop pide Master o confirma).
- Master ve botón “Add item” y “Remove”.

Empty: “Your inventory is a sad, empty box. The System is judging you.”

---

## P10. Notificaciones

Lista (componente 19). Filtros chips: All · Rewards · Penalties · System · Combat.

Detalle: abre el cinematic si no se vio, o una card estática si ya se ackeó.

Badge en nav = unread count, pill naranja.

---

## P11. Reward cinematic (overlay)

z-index 70. Overlay void 72%.

Card central:

- Label Orbitron `REWARD` gold/naranja.
- Arte/slot del item con glow legendary.
- Nombre + rareza chip.
- Quote del Sistema (1–2 frases).
- CTA “CLAIM” fill naranja-rosa.

Partículas cortas. Accesible: focus trap en CLAIM.

---

## P12. Penalty cinematic

Misma estructura. Label `PENALTY` rojo. Sin partículas. Flash de borde. CTA “ACKNOWLEDGE” outline danger.

---

## P13. Log de eventos

### Master

Full width. Filtros: crawler, piso, tipo, rango temporal. Export ghost. Auto-scroll. Detalle en drawer.

### Jugador

Solo eventos que le conciernen o anuncios de piso. Más “diario de crawler” que SIEM.

---

## P14. Jugador — Home HUD

Calcar nav inferior de ref 2.

- Status strip sticky.
- Objetivo actual (una card).
- Últimas 3 notificaciones.
- Party portraits compactos.
- Acceso rápido inventario.

---

## P15. Minimapa / Piso

Dot-matrix (no tilemap pixel). El Master edita en Mundo: pintar, paredes, drag de fichas/puertas/obstáculos. Pinchar ficha = jugador / NPC / enemigo.

Crawlers lo ven en Escena, solo lectura. Puntos: tú = blanco · party y NPC = oro · enemigos = rojo.

---

## P16. Settings

Wells: perfil, audio de UI (on/off whoosh), reduced motion, tema (solo “System Standard”; no light mode). Master: código de sala, peligro zona (borrar sesión) botón danger.

---

## P17. Estados globales

| Estado | UI |
|---|---|
| Loading página | Skeleton wells (gris cyan 8%, radius heredado), no spinner gigante |
| Error de red | Banner danger + retry outline |
| Sesión pausada | Overlay “THE SYSTEM IS BUFFERING” |
| Crawler dead | HUD desaturado 30% + banner “YOU ARE DEAD” |
| Offline | pip gris en topbar |

Cada pantalla nueva debe declarar: empty, loading, error, populated, y si aplica cinematic.
