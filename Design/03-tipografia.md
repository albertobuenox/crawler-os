# Tipografía

Tres voces. Nunca una sola fuente para todo.

## Familias

| Rol | Familia | Fallback | Dónde |
|---|---|---|---|
| Display / Sistema | **Orbitron** | Rajdhani, "Segoe UI" | Títulos de HUD, “SYSTEM MESSAGE”, nombre de piso, LEVEL |
| UI | **Sora** | Inter, "Segoe UI" | Navegación, formularios, body, botones |
| Stats / números | **Rajdhani** | Sora, Inter | HP, atributos, contadores grandes (tabular nums) |
| Log / código del Sistema | **JetBrains Mono** | "Share Tech Mono", ui-monospace | Event log, timestamps, IDs de recurso, mensajes crudos |

Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@500;700;800&family=Rajdhani:wght@500;600;700&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## Escala (rem, root 16px)

| Token | Size | Line | Weight | Tracking | Uso |
|---|---|---|---|---|---|
| `--fs-display` | 40–48px | 1.05 | Orbitron 800 | 0.08em | Título de pantalla (MEDIA KIT energy) |
| `--fs-h1` | 28–32px | 1.15 | Orbitron 700 | 0.06em | Nombre de crawler, nombre de piso |
| `--fs-h2` | 22px | 1.2 | Sora 600 | 0.02em | Sección de card (“At a Glance”) |
| `--fs-h3` | 16px | 1.3 | Sora 600 | 0.04em | Card title |
| `--fs-body` | 14px | 1.55 | Sora 400 | 0 | Párrafo, descripciones |
| `--fs-ui` | 13px | 1.4 | Sora 500 | 0.02em | Nav, tabs, botones |
| `--fs-label` | 11px | 1.3 | Sora 600 | 0.14em | Labels uppercase (“STRENGTH”) |
| `--fs-stat` | 28–36px | 1 | Rajdhani 700 | 0 | Números hero (“1.2M+”, 847 HP) |
| `--fs-stat-sm` | 18px | 1 | Rajdhani 600 | 0 | Stats compactos |
| `--fs-mono` | 12px | 1.45 | JetBrains 400 | 0 | Log lines |
| `--fs-mono-sm` | 10px | 1.4 | JetBrains 500 | 0.04em | IDs, hashes, floor codes |

## Reglas de jerarquía (como las referencias)

1. **Título grande blanco** (Orbitron o Sora bold) + **subtítulo cian** más pequeño.
2. **Número cian enorme** + **label uppercase gris** debajo. Exactamente el patrón “1.2M+ / FOLLOWERS”.
3. Labels de atributos siempre `uppercase`, `letter-spacing: 0.14em`, color `--text-3`.
4. El cuerpo nunca es blanco puro. El blanco se reserva a H1 y a números críticos.
5. Mensajes del Sistema: header Orbitron + body JetBrains Mono o Sora, nunca al revés.

## Casos especiales

### System Message

```
SYSTEM MESSAGE                    ← Orbitron 700, 11px, cyan, tracking 0.18em
You have been fined 200 gold      ← Sora 500, 14px, text-1
because you pet the wrong cat.    ← Sora 400, 13px, text-2
```

### Stat block (hoja de personaje)

```
STR        18                     ← label fs-label / value fs-stat cyan
```

Valor en `--cyan-400`. Si el atributo está buffed, `--ok`. Si está cursed, `--danger`.

### Log de eventos

```
02:14:08  [REWARD]  Carl  →  Box of Doom (Legendary)
```

Timestamp `--text-4`, tag entre corchetes con color semántico, resto `--text-2`. Mono.

## Alineación

- Stats y dinero: tabular-nums, a la derecha en tablas, centrados en hero KPIs.
- Títulos de card: izquierda.
- CTAs: centrado en login; derecha en toolbars de Master.

## No usar

- Serif, script, blackletter, Comic, pixel fonts retro (8-bit).
- Outline rainbow en texto.
- Texto neon ilegible (cyan 400 sobre cyan glow sin sombra oscura).
- Más de dos pesos de Orbitron por pantalla.
