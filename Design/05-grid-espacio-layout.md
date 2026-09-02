# Grid, espacio y layout

## Breakpoints

| Token | Ancho | Target |
|---|---|---|
| `--bp-sm` | 390px | Móvil jugador (HUD una columna) |
| `--bp-md` | 768px | Tablet / Master compacto |
| `--bp-lg` | 1200px | Desktop Master (default de diseño) |
| `--bp-xl` | 1440px | Dashboard de referencia (media kit) |
| `--bp-2xl` | 1720px | Master con log + canvas simultáneos |

Diseñar primero a **1440×900**. El Master es un producto desktop. El Jugador debe funcionar en 390px sin perder el HUD.

## Espaciado (escala 4)

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

| Token | Valor | Uso |
|---|---|---|
| `--space-1` | 4px | Gap de dots, hairline |
| `--space-2` | 8px | Icono–label |
| `--space-3` | 12px | Chips, meta rows |
| `--space-4` | 16px | Padding interno de wells |
| `--space-5` | 20px | Padding de cards |
| `--space-6` | 24px | Gap entre cards |
| `--space-8` | 32px | Gap de secciones |
| `--space-10` | 40px | Márgenes de shell |
| `--space-12` | 48px | Hero login |

## Radius

| Token | Valor | Uso |
|---|---|---|
| `--r-sm` | 8px | Inputs, chips, bars |
| `--r-md` | 14px | Nested wells, icon buttons |
| `--r-lg` | 20px | Cards |
| `--r-xl` | 24px | Shell, modales |
| `--r-pill` | 999px | CTA pill, tags, HP bar |

Las referencias usan radios **grandes**. Evitar 4px (se siente admin CRUD).

## Shells de página

### Master desktop (1440)

```
┌─ topbar 64px (cristal, logo SYSTEM, sesión, clock, master avatar)
├─ sidebar 72–88px icon rail  OR  240px icon+label
└─ main
     ├─ page title + actions
     └─ grid 12 cols, gap 24px
```

Rail de iconos como la nav inferior de la referencia 2, pero vertical a la izquierda en desktop. Cada icono: rounded square 48px, glow del color de sección.

### Jugador (móvil / overlay HUD)

```
┌─ status strip (HP / MANA / STA / LV)
├─ objetivo actual (una línea)
├─ contenido (sheet / inventory / log)
└─ nav inferior 72px, 4–5 iconos con glow
```

La nav inferior es copia directa de la referencia 2: tiles rounded, icono con aura.

### Login

Centrado. Un único panel cristal 420–480px. Fondo void con bokeh intenso. Selector Master / Crawler como dos tiles grandes, no un `<select>`.

## Grid de dashboard (calcar las refs)

Patrón “media kit”:

- Fila 1: título + CTA.
- Fila 2: 3–4 KPI cards (“At a Glance”) — HP party, crawlers vivos, piso, cajas abiertas.
- Fila 3: 8 cols gráfico + 4 cols donut o lista.
- Fila 4: bloque denso (log, about, performance).

Patrón “glass dashboard” (ref 2):

- Frame único de cristal.
- Columna izq: user stats + portrait.
- Columna der: analytics + actions.
- Abajo: icon nav.

## Densidad

| Superficie | Densidad |
|---|---|
| Master resource tables | Alta: filas 44–48px, mono IDs |
| Master dashboard | Media: KPI grandes, wells |
| Character sheet | Media: stats enormes, lore compacto |
| Inventory | Grid 64–72px slots (desktop), 56px (móvil) |
| Notifications | Media: 1 evento = 1 card, no tabla |
| Login | Baja: mucho vacío, un foco |

## Z-index

| Capa | z |
|---|---|
| Canvas / bokeh | 0 |
| Shell y cards | 10 |
| Sticky topbar / nav | 20 |
| Dropdowns | 30 |
| Modal overlay | 40 |
| Modal | 50 |
| Toast / System Message | 60 |
| Reward/Penalty cinematic | 70 |

## Scroll

Scrollbars 6px, thumb `rgba(0,212,255,0.35)`, track transparente.  
El log de eventos es la única superficie que puede ser “terminal”: fondo más oscuro, mono, auto-scroll al fondo con pausa si el usuario sube.
