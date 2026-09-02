# Rules — estilo Crawler OS

Reglas de estilo para **desarrolladores y agentes de Cursor** al implementar funcionalidades o crear componentes.

Cursor carga automáticamente las versiones `.mdc` de `.cursor/rules/`. Esta carpeta es la versión extendida, consultable y versionable.

## Orden de consulta

1. `.cursor/rules/*.mdc` — contrato corto que el agente debe cumplir siempre.
2. Esta carpeta — detalle operativo (MUST / SHOULD / NEVER).
3. `Design/` — especificación visual completa, tokens y pantallas.
4. `References/` — verdad visual (imágenes). Si el código y la imagen discrepan, gana la imagen + tokens.

## Índice

| Archivo | Cuándo leerlo |
|---|---|
| `01-identidad-visual.md` | Cualquier UI, CSS, tema, layout |
| `02-componentes-ui.md` | Crear o editar un componente |
| `03-pantallas-y-roles.md` | Nueva página, ruta, flujo Master/Jugador |
| `04-notificaciones-logs.md` | Toasts, cinematics, event log, campana |
| `05-implementacion.md` | Tokens, CSS, librerías, estructura de archivos |

## Contrato mínimo (si solo puedes recordar 8 líneas)

1. Fondo void `#05060D` + glass + rim light. Nunca fondo claro.
2. Tokens de `Design/12-tokens.css`. Nunca hex sueltos de Tailwind default.
3. Cian = Sistema. Magenta = crawler. Naranja = reward. Rojo = penalty.
4. Tres CTAs: fill naranja-rosa, outline cyan, pill púrpura-azul.
5. Orbitron (Sistema) · Sora (UI) · Rajdhani (stats) · JetBrains Mono (logs).
6. Master denso; Crawler HUD. Ocultar lo que el rol no puede hacer.
7. Copy de Sistema según `Design/11-voz-del-sistema.md`. No “Oops”.
8. No light mode. No emoji en System Messages. No shadcn crudo.
