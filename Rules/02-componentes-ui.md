# Componentes UI

Fuente: `Design/08-componentes.md`. No introducir un cuarto lenguaje de controles.

## MUST — botones

Solo estas familias:

| Clase | Look | Uso |
|---|---|---|
| `btn-energy` | Gradiente `#F97316 → #EC4899`, glow naranja, pill | Reward, claim, acción caliente |
| `btn-neon` | Outline 1.5px cian, fill void, glow cian | Secundario, abrir, upgrade, tools |
| `btn-session` | Gradiente `#7C3AED → #2563EB`, pill | Sesión, login Master, iniciar piso |
| Ghost | Sin fill, texto `--text-2` | Cancel, back |

Estados: hover sube glow (`--t-ui`). Disabled opacity 0.45, sin glow. Loading: ring 2px cian dentro del botón, no spinner rainbow.

## MUST — inputs

Height 44px, radius 12px, well oscuro, focus border cian + glow 12px. Label uppercase encima. Error = `--danger`. Nunca placeholder como único label.

## MUST — paneles

`GlassPanel` con variantes `default | system | identity | nested | danger | reward`. Header: glow disc + título + optional 4-dots. Ver anatomía en Design/08.

## MUST — inventario y stats

- Slot 64px (56 móvil), dashed si vacío, badge qty, rareza en stroke.
- Barras HP/MP/STA/XP: track void, fill semántico, números Rajdhani `actual/max`.
- Portrait con anillo 2px + glow, no avatar genérico de iniciales sobre plano.

## MUST — tablas Master

Filas 48px, hover cyan 4%, ID en mono, selección con barra cian 2px a la izquierda. Header sticky `fs-label`.

## SHOULD

- Tabs con indicador cian glow, no underline negro.
- Chips pill fill 12% del color semántico.
- Empty: icono cian 50% + frase del Sistema + un CTA outline. Copy en `Design/11-voz-del-sistema.md`.
- Iconos: una familia line (Lucide/Phosphor/Tabler), stroke ~2px. Default cian.

## NEVER

- Importar un componente shadcn/MUI/Chakra y dejar sus colores default.
- Botón azul `#2563EB` sólido plano (el azul solo existe **dentro** del gradiente session, no solo).
- `<select>` nativo sin reskin en login de rol (usar tiles Master/Crawler).
- Emoji como icono de nav o de rareza.
- Modal blanco con overlay gris.

## Ejemplo

```tsx
// BAD
<button className="bg-blue-600 rounded">Submit</button>

// GOOD
<button className="btn-session">Jack In</button>
<button className="btn-energy">Claim</button>
<button className="btn-neon">Open sheet</button>
```
