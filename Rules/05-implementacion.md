# Implementación

Cómo bajar el diseño a código sin perder el HUD.

## MUST

- Copiar `Design/12-tokens.css` al theme global (`:root` o CSS variables del framework) **antes** de pintar componentes.
- Tipografías: Orbitron, Sora, Rajdhani, JetBrains Mono (ver `Design/03-tipografia.md`). `font-variant-numeric: tabular-nums` en stats.
- `prefers-reduced-motion: reduce`: solo opacity; sin scale, partículas, glitch, pulse de HP.
- Contraste de cuerpo: usar `--text-2` sobre void, no `--text-3` para párrafos.
- Focus visible = anillo/borde cian. No outline default del browser.

## SHOULD — stack UI

Si se usa React: reskin total de primitives (Button, Input, Dialog, Tabs). Los tokens mandan, no la librería.

Estructura sugerida:

```
src/
  styles/tokens.css          ← espejo de Design/12-tokens.css
  styles/glass.css           ← .glass, .well, rim
  components/ui/             ← primitives reskinned
  components/hud/            ← bars, slots, system-message, cinematic
  components/master/         ← tablas, assignment, resource editor
  layouts/MasterShell.tsx
  layouts/CrawlerShell.tsx
```

Nombres de clase semánticos (`btn-energy`, `glass`, `well`) mejor que `bg-orange-500` repetido.

## SHOULD — generación visual

Pantallas nuevas: usar `Design/13-prompts-generacion.md` + imágenes de `References/`. Recortar componentes buenos y guardarlos en `References/` para la siguiente iteración.

## NEVER

- Instalar un theme “cyberpunk CSS” de terceros que pise tokens.
- `dark:` de Tailwind como único sistema (el vacío no es `slate-950` genérico).
- Inline styles con hex aleatorios.
- Animar layout con librerías de confetti/particles en cada hover.
- Commitear screenshots de Midjourney como si fueran el design system: las refs inspiran; los tokens mandan en código.

## Orden de trabajo de un agente

1. Leer `.cursor/rules/` (ya inyectadas) + `Rules/README.md` contrato mínimo.
2. Abrir la spec de pantalla en `Design/09` y componentes en `Design/08`.
3. Implementar con tokens.
4. Verificar empty/loading/error y rol Master vs Crawler.
5. Si hay loot/pena, cumplir `Rules/04`.
6. Contrastar con `Design/14-do-dont.md`.
