# Sistema de color

Paleta extraída de las dos referencias: void navy, cian eléctrico, magenta/púrpura, naranja-rosa de CTA, blanco de alta jerarquía.

## Fondos (Void)

| Token | Hex | Uso |
|---|---|---|
| `--void-950` | `#05060D` | Canvas raíz, login, pantallas inmersivas |
| `--void-900` | `#0A0C18` | Superficie de página |
| `--void-800` | `#10131F` | Nested cards, wells interiores |
| `--navy-850` | `#0D1224` | Alternativa con sesgo azul |
| `--navy-700` | `#151B32` | Hover de wells, sidebars densas |

Nunca usar blanco o gris claro como fondo de página.

## Cristal (surfaces)

No usar hex opaco para paneles. El cristal es RGBA + blur.

| Token | Valor | Uso |
|---|---|---|
| `--glass-hi` | `rgba(255,255,255,0.08)` | Panel principal, modales |
| `--glass-mid` | `rgba(255,255,255,0.05)` | Cards secundarias |
| `--glass-low` | `rgba(255,255,255,0.03)` | Nested well, filas de tabla |
| `--glass-cyan` | `rgba(0,212,255,0.06)` | Panel “Sistema”, logs, data |
| `--glass-magenta` | `rgba(232,121,249,0.06)` | Perfil, party, magia |
| `--glass-danger` | `rgba(255,59,92,0.08)` | Penalización, muerte |
| `--glass-reward` | `rgba(249,115,22,0.08)` | Recompensa, loot |

Gradiente de superficie recomendado:

```css
background: linear-gradient(
  145deg,
  rgba(255,255,255,0.09) 0%,
  rgba(255,255,255,0.03) 42%,
  rgba(0, 212, 255, 0.04) 100%
);
```

## Primarios neón

| Token | Hex | Glow RGBA | Rol |
|---|---|---|---|
| `--cyan-300` | `#7DF9FF` | — | Highlights, iconos activos |
| `--cyan-400` | `#22F0FF` | `rgba(34,240,255,0.55)` | Stats, bordes activos, links |
| `--cyan-500` | `#00D4FF` | `rgba(0,212,255,0.45)` | Primario Sistema |
| `--cyan-700` | `#0891B2` | — | Texto cian sobre glow (legible) |

El cian es el color **default del Sistema**. Barras de datos, iconos lineales, outlines de foco, gráficos.

## Secundarios (identidad)

| Token | Hex | Glow RGBA | Rol |
|---|---|---|---|
| `--magenta-400` | `#F0ABFC` | — | Labels mágicos |
| `--magenta-500` | `#E879F9` | `rgba(232,121,249,0.5)` | Perfil, party, skills |
| `--purple-500` | `#A855F7` | `rgba(168,85,247,0.45)` | Gradientes de CTA secundario |
| `--purple-600` | `#7C3AED` | — | Extremo del pill “colabora” |

CTA pill de referencia 1: `linear-gradient(90deg, #7C3AED 0%, #2563EB 100%)`.

## Energía / loot (referencia 2)

| Token | Hex | Glow RGBA | Rol |
|---|---|---|---|
| `--orange-400` | `#FB923C` | `rgba(251,146,60,0.5)` | Hover de recompensa |
| `--orange-500` | `#F97316` | `rgba(249,115,22,0.45)` | CTA fill, loot, urgencia positiva |
| `--pink-500` | `#EC4899` | `rgba(236,72,153,0.4)` | Extremo del gradiente Upload |
| `--gold-400` | `#FBBF24` | `rgba(251,191,36,0.5)` | Legendario, XP, logro |

CTA fill de referencia 2: `linear-gradient(90deg, #F97316 0%, #EC4899 100%)`.

## Semántica de juego (no decorativa)

Estos colores **no se reutilizan** para chrome genérico.

| Token | Hex | Significado |
|---|---|---|
| `--hp` | `#FF3B5C` | Vida, daño recibido, muerte |
| `--hp-soft` | `#FB7185` | HP alto todavía dañado |
| `--mana` | `#3B82F6` | Maná / recurso mágico |
| `--stamina` | `#34D399` | Stamina / endurance |
| `--xp` | `#FBBF24` | Experiencia |
| `--ok` | `#4ADE80` | Éxito, curación, buff |
| `--warn` | `#FBBF24` | Aviso, cooldown, inestable |
| `--danger` | `#FF3B5C` | Penalización, error, wipe |
| `--info` | `#00D4FF` | Mensaje del Sistema, log neutro |
| `--offline` | `#64748B` | Desconectado, vacío, disabled |

## Texto

| Token | Hex | Uso |
|---|---|---|
| `--text-1` | `#F8FAFC` | Títulos, números hero |
| `--text-2` | `#CBD5E1` | Cuerpo |
| `--text-3` | `#94A3B8` | Labels, meta, placeholders |
| `--text-4` | `#64748B` | Disabled, timestamps secundarios |
| `--text-cyan` | `#A5F3FC` | Subheads de Sistema |
| `--text-on-neon` | `#05060D` | Texto sobre botón fill naranja/cian sólido |

Contraste mínimo de cuerpo sobre void: `#CBD5E1` sobre `#05060D` (AAA).  
No poner `--text-3` sobre glass-low sin icono o peso extra.

## Bordes

| Token | Valor |
|---|---|
| `--stroke-glass` | `1px solid rgba(255,255,255,0.10)` |
| `--stroke-cyan` | `1px solid rgba(0,212,255,0.35)` |
| `--stroke-cyan-hot` | `1px solid rgba(34,240,255,0.70)` |
| `--stroke-magenta` | `1px solid rgba(232,121,249,0.35)` |
| `--stroke-reward` | `1px solid rgba(249,115,22,0.45)` |
| `--stroke-danger` | `1px solid rgba(255,59,92,0.55)` |
| `--stroke-inset` | `inset 0 1px 0 rgba(255,255,255,0.16)` |

El canto superior-izquierdo de cada card lleva highlight (luz incidente). El canto inferior es más oscuro.

## Rareza de objetos (inventario)

| Rareza | Acento | Glow |
|---|---|---|
| Common | `#E2E8F0` | casi nulo |
| Uncommon | `#34D399` | `rgba(52,211,153,0.35)` |
| Rare | `#00D4FF` | `rgba(0,212,255,0.45)` |
| Epic | `#A855F7` | `rgba(168,85,247,0.5)` |
| Legendary | `#FBBF24` | `rgba(251,191,36,0.6)` |
| Celestial / Unique | `#E879F9` + `#F97316` | dual glow magenta-naranja |

## Atmósfera de fondo (no es color plano)

El canvas siempre tiene:

1. Base `--void-950`.
2. Radial magenta/púrpura arriba-derecha: `radial-gradient(ellipse 60% 50% at 80% -10%, rgba(168,85,247,0.22), transparent 60%)`.
3. Radial cian abajo-izquierda: `radial-gradient(ellipse 50% 40% at 10% 110%, rgba(0,212,255,0.12), transparent 60%)`.
4. Bokeh: 6–12 orbes blurreado (naranja, rosa, azul) a opacidad 0.12–0.28, como la referencia 2.
5. Opcional: arco de luz (conic / streak) muy sutil detrás del panel central.

Los orbes **no** se mueven rápido. Deriva de 20–40s o están estáticos.

## Mapa rápido Master vs Jugador

- Master: más cian, más data, nested wells oscuros, densidad alta.
- Jugador: más magenta en identidad, más naranja en loot, cards más grandes, menos tablas.
