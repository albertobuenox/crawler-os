# Componentes

Anatomía para implementar o generar cada pieza. Tokens en `12-tokens.css`.

## 1. Panel / Card (GlassPanel)

**Anatomía:** shell cristal + `::before` rim + header opcional (icon disc + title + 4-dots) + body + footer opcional.

**Variantes:** `default` · `system` (fill cyan 6%) · `identity` (magenta) · `nested` (well oscuro, sin blur) · `danger` · `reward`.

**Header:** icono 36px glow disc, título `fs-h3`, meta `fs-label`. Dots 2×2 a la derecha si hay menú.

**Estados:** rest, hover (stroke cyan), selected (stroke-cyan-hot + glow), disabled (opacity 0.45, sin hover).

## 2. Botones

Tres familias, calcadas de las referencias. No inventar una cuarta.

### A. Fill energía (ref 2 “Upload”)

- Gradiente `#F97316 → #EC4899`.
- Texto `--text-1` o blanco, Sora 600, 13–14px.
- Radius pill o 12px.
- Glow naranja.
- Uso: confirmar loot, otorgar recompensa, acción primaria caliente.

### B. Outline neón (ref 2 “Upgrade Pro”)

- Fill `rgba(5,6,13,0.65)`.
- Border 1.5–2px `--cyan-400` + glow cyan.
- Texto cian o blanco.
- Uso: secundario, “ver hoja”, “abrir log”, upgrade, Master tools no destructivas.

### C. Pill púrpura-azul (ref 1 “Let’s collaborate”)

- Gradiente `#7C3AED → #2563EB`.
- Texto blanco.
- Uso: CTA de sesión (“INICIAR PISO”, “INVITAR CRAWLER”), login submit Master.

### D. Ghost

- Sin fill, texto `--text-2`, hover texto blanco + underline glow.
- Uso: cancelar, “más tarde”.

**Tamaños:** sm 32px · md 40px · lg 48px. Icon+label gap 8px. Nunca botón solo texto gris plano.

## 3. Inputs

- Height 44px, radius 12px.
- Fill `--void-800` / `rgba(255,255,255,0.04)`.
- Border `rgba(255,255,255,0.10)`.
- Focus: border cyan + glow 12px. Sin outline de browser.
- Label `fs-label` uppercase encima, no placeholder como único label.
- Error: border danger + texto 12px danger debajo.
- Master search: icono left, kbd hint right (`⌘K` en mono).

## 4. KPI / Stat (At a Glance)

Patrón de la ref 1:

```
[icon disc]     847
                HP  ·  CARL
```

Número `fs-stat` cian. Label uppercase `fs-label`. Opcional sparkline 40px a la derecha. 3–4 por fila.

## 5. Barras de recurso

- Track 8–10px, pill, `--void-800`.
- Fill HP rojo, Mana azul, Stamina verde, XP oro.
- Valor numérico a la derecha en Rajdhani (`142 / 200`).
- Segmentos opcionales cada 25% con hairline void.

## 6. Tabs

- Sublínea: tabs texto `fs-ui`, activo blanco, indicador 2px cyan glow.
- Encapsuladas: well oscuro, tab activa glass + stroke cyan.
- No tabs Material underline negro.

## 7. Tabla (Master recursos)

- Header sticky, `fs-label`, `--text-3`.
- Filas 48px, hover fill cyan 4%.
- Separadores `rgba(255,255,255,0.06)`.
- Columna ID en mono.
- Acciones a la derecha: icon buttons ghost.
- Fila seleccionada: stroke cyan interno izquierdo 2px.

## 8. Inventory slot

- 64px, radius 12px, well oscuro.
- Icono centrado 32px.
- Borde = rareza.
- Qty badge esquina inf-der, pill 14px, void + texto blanco.
- Equipped: esquina sup-izq chevron cian.
- Empty: dashed stroke 1px `rgba(255,255,255,0.12)`.
- Drag: slot se escala 1.05, glow rareza.

Grid: 6–8 columnas desktop en panel inventario; 4–5 móvil.

## 9. Character portrait

- 72–120px, radius 20px o círculo.
- Anillo 2px (clase/raza color) + glow.
- Debajo: nombre Orbitron, nivel chip gold, clase `fs-label` magenta.
- Master puede ver un stack de portraits de party con HP pips.

## 10. Nav icon tile

Ver `06-iconografia.md`. Active = glow color de sección + well 12% de ese color.

## 11. Chips / tags

- Height 24px, pill, `fs-label` (o 10px).
- Fill color 12%, texto del mismo color más claro.
- Tipos: piso, raza, estado (buff/debuff), rareza, rol Master/Crawler.

## 12. Modal

- Overlay `rgba(5,6,13,0.72)` + blur 8px.
- Panel `GlassPanel` r-xl, max 640px (forms) / 960px (sheet).
- Header con título Orbitron pequeño + close ghost.
- Footer sticky con Ghost + Fill o Outline.

## 13. System Message (toast / banner)

```
┌ SYSTEM MESSAGE ──────────────── ●
│  [icon]  Title in Sora 600
│          Body 2 líneas máx.
│          [ACK] outline cyan
└─────────────────────────────────
```

Banner ancho top-center 520px. Toast esquina 360px.  
Reward/Penalty usan la misma caja con variante de color y título distinto (`REWARD` / `PENALTY`).

## 14. Event log row

```
02:14:08  [REWARD]  Carl  Box of Doom
          floor 3 · assigned by Master
```

- Mono 12px.
- Tag color semántico (reward naranja, penalty rojo, system cian…).
- Click → drawer de detalle.
- Filtros chips arriba: All / Reward / Penalty / Combat / System.

## 15. Empty states

Icono 40px cian 50% + título Sora 600 + una frase del Sistema (ver `11-voz-del-sistema.md`) + CTA outline. Nunca ilustración clipart.

## 16. Toggle / Switch

Track 36×20, knob 16, on = cyan fill + glow, off = void + stroke.

## 17. Segmented control (Master/Jugador en login)

Dos tiles 50/50 dentro de un well:

- Master: icono corona/terminal, aura cian.
- Crawler: icono bust, aura magenta.
- El seleccionado: stroke hot + glow, el otro apagado.

## 18. Assignment picker (Master)

Dual list o checklist de crawlers con portraits 24px + search. Confirmar con botón Fill naranja si es loot, Outline cyan si es recurso neutro, Danger fill si es penalización.

## 19. Notification list item

- Izq: icon disc del tipo.
- Centro: título + snippet + tiempo relativo (`hace 2m`).
- Der: unread pip cyan.
- Unread: fill cyan 5%. Read: transparente.
- Swipe o botón para ack.

## 20. Page header

```
SYSTEM  /  CRAWLERS  /  CARL
Carl — Floor 3                         [ Grant loot ] [ Penalty ]
```

Breadcrumb `fs-label` cyan. Título `fs-h1`. Acciones a la derecha.

---

Si un componente no está aquí, componerlo con GlassPanel + los tipos de botón + chips. No importar un kit SaaS (shadcn crudo sin tokens) sin reskin completo.
