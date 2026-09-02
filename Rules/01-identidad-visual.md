# Identidad visual

Fuente: `Design/02`–`07` y `Design/12-tokens.css`. Referencias en `References/`.

## MUST

- Usar variables de `Design/12-tokens.css` (o el equivalente en el theme del proyecto). Prohibido `#00ffff` inventado, `bg-slate-900` de Tailwind como sustituto del void, o `blue-500` de default.
- Canvas de página: `var(--grad-canvas)` o `--void-950` + radiales púrpura/cian + bokeh detrás de los paneles.
- Toda card, modal, sidebar, toast y sheet usa material **glass** (`backdrop-filter` ≥ 20px, fill RGBA blanco 3–9%, border 1px `stroke-glass`, radius `--r-lg` o `--r-xl`).
- Wells interiores (gráficos, stats, listas) son **más oscuros y más opacos** (`--void-800`), no más glass.
- Rim light en el canto superior (highlight blanco/cian). Ver `Design/04-materiales-y-efectos.md`.
- Glow solo en: foco/hover, dato vivo, nav activa, rareza, cinematic. Un acento por elemento.
- Texto: `--text-1` títulos y números críticos; `--text-2` cuerpo; `--text-3` labels uppercase.

## SHOULD

- KPI: número `--fs-stat` en `--cyan-400` + label `--fs-label` uppercase `--text-3` debajo.
- Gráficos: trazo cian y/o magenta, fill area 12%, grid 6% blanco. Barras radius 8px.
- Nav: cada icono con aura de color distinta (púrpura / magenta / cian / naranja / teal), como la referencia 2.
- Inventario: el color lo lleva el **borde de rareza**, no el fondo entero del slot.

## NEVER

- Light mode, tema beige, pergamino medieval, pixel art 8-bit, cyberpunk sucio (lluvia, glitch permanente, cromo oxidado).
- Sombra Material `0 4px 6px rgb(0 0 0 / 0.1)` sobre card blanca.
- Radius 4px en paneles. Mínimo cards 20px.
- Aplicar `drop-shadow` enorme a todo el layout.
- Poner texto `--cyan-400` sobre glow cian sin fondo well oscuro.

## Checklist rápido

- [ ] ¿Se ve el vacío + orbes detrás del cristal?
- [ ] ¿Las cards son translúcidas, no rectángulos `#1e293b` sólidos?
- [ ] ¿Hay un solo color neón dominante por región?
- [ ] ¿Los números grandes son cian y las labels tiny uppercase?
