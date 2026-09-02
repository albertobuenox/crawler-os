# Motion

La interfaz es un holograma estable, no un rave. Movimiento = feedback del Sistema.

## Duraciones

| Token | ms | Uso |
|---|---|---|
| `--t-micro` | 120 | Color, glow, borde |
| `--t-ui` | 180 | Hover, tabs |
| `--t-panel` | 280 | Abrir card, drawer |
| `--t-modal` | 360 | Modal, System Message |
| `--t-cinematic` | 700–1200 | Reward / penalty / level-up |

Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (decel holográfico).  
Salidas: `cubic-bezier(0.4, 0, 1, 1)`.

## Entrada de paneles

Los HUD windows no hacen fade plano. Hacen:

1. Opacity 0 → 1.
2. TranslateY(8px) → 0 **o** scale(0.96) → 1.
3. Glow del borde 0 → valor de reposo.

Stagger 40–60ms entre cards del mismo dashboard (máximo 6).

## Hover / focus

- Glow +1 nivel, stroke más caliente, translateY(-1px) opcional.
- Botón fill: saturación +8%, sombra naranja/magenta más amplia.
- No scale > 1.03 en botones (barato).

## Barras de recurso

HP/Mana/Stamina animan el width 280ms.  
Si el daño es > 20% max HP: flash rojo 120ms en el track.  
Si heal: flash verde.  
Crit / downed: la barra pulsa (opacity 1 ↔ 0.7, 900ms) hasta que el estado cambia.

## Notificaciones

### Toast Sistema (cian)

Slide desde arriba-centro o esquina top-right. 4.5s. Pausa on hover.

### Reward (naranja)

1. Overlay 40% void.
2. Card cristal scale 0.9 → 1.05 → 1.
3. Burst de partículas (12–20 orbes, 600ms, no confeti cartoon).
4. Título Orbitron “REWARD”.
5. El usuario cierra o auto 3.5s.

### Penalty (rojo)

1. Flash de borde `--danger` en todo el shell (80ms).
2. Card entra más rápida, sin bounce.
3. Título “PENALTY” / “FINE” / “THE SYSTEM IS DISPLEASED”.
4. Sin partículas alegres. Opcional: glitch de 2 frames en el título (máximo, no permanente).

### Log

Líneas nuevas: highlight cyan fill 12% que se desvanece en 1.2s. Auto-scroll.

## Nav activa

El glow del icono sube y un pip o underline cian de 2px aparece. Crossfade, no layout jump.

## Lo que no se anima

- Grain / scanlines (o loop > 20s).
- Bokeh rápido.
- Parallax agresivo que mueva texto.
- Loaders rainbow. Usar ring cian 2px sobre track void, 800ms/rotación.

## Accesibilidad

`prefers-reduced-motion: reduce`: solo opacity, sin scale, sin partículas, sin glitch, sin pulse de HP.
