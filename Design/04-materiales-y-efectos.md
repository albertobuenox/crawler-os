# Materiales y efectos

Esto es lo que hace que la UI se sienta SAO / isekai y no un dashboard SaaS oscuro.

## 1. Glassmorphism (material principal)

Toda card, modal, sidebar y toast es cristal.

```css
.glass {
  background: linear-gradient(
    145deg,
    rgba(255,255,255,0.09),
    rgba(255,255,255,0.03)
  );
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 20px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.16),
    0 8px 32px rgba(0,0,0,0.45),
    0 0 40px rgba(0, 212, 255, 0.06);
}
```

Valores:

| Propiedad | Default | Modal / HUD hero | Nested well |
|---|---|---|---|
| Blur | 24px | 32px | 8px (o ninguno) |
| Saturate | 140% | 160% | 100% |
| Radius | 20px | 24px | 14px |
| Fill | 8% → 3% blanco | 10% → 4% | `--void-800` al 80% |

Los wells interiores de la referencia 2 son **más opacos y más oscuros**, no más glass. Anidan: cristal grande → well navy.

## 2. Canto de luz (rim light)

Cada panel tiene un highlight en el borde superior (luz incidente, como las refs).

Implementación preferida: pseudo-elemento.

```css
.glass::before {
  content: "";
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.55) 0%,
    rgba(0,212,255,0.25) 28%,
    rgba(255,255,255,0.00) 48%,
    rgba(168,85,247,0.15) 100%
  );
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}
```

Paneles activos (foco, drag, “esta es tu hoja”): el gradiente se calienta a `--stroke-cyan-hot`.

## 3. Glow

Glow **solo** en:

- Elemento interactivo con foco o hover.
- Dato vivo (HP, loot drop, notificación nueva).
- Icono de nav activo (cada uno de un color, como ref 2).
- Rareza de item.

```css
--glow-cyan: 0 0 24px rgba(0, 212, 255, 0.45);
--glow-magenta: 0 0 24px rgba(232, 121, 249, 0.4);
--glow-orange: 0 0 28px rgba(249, 115, 22, 0.5);
--glow-gold: 0 0 28px rgba(251, 191, 36, 0.55);
--glow-danger: 0 0 24px rgba(255, 59, 92, 0.5);
```

No aplicar glow a todos los bordes a la vez. Si todo brilla, nada brilla.

## 4. Nested depth (referencia 2)

Tres capas obligatorias en dashboards:

1. **Canvas** void + radiales + bokeh.
2. **Shell de cristal** (el “media kit” grande / el dashboard frame).
3. **Wells** `--void-800`, radius 14px, padding 16–20px: Analytics, User Stats, Inventory grid.

El avatar / portrait se recorta en círculo o rounded-2xl con anillo `2px` cyan o magenta y glow suave.

## 5. Fondos atmosféricos

Partículas / bokeh:

- Círculos 40–180px, `filter: blur(20px)`, colores `--orange-400`, `--pink-500`, `--cyan-500`, `--purple-500`.
- Opacidad 0.10–0.25.
- No ocluyen texto: z-index bajo el glass, nunca sobre contenido.

Opcional HUD:

- Scanline global a 4% opacidad, `repeating-linear-gradient`.
- Grain 3–5% (SVG fractal noise). Solo en canvas, no en texto.

## 6. Gráficos (de las referencias)

- **Line chart:** trazo 2px cian y/o magenta, puntos con glow, fill area `rgba(cyan, 0.12)`. Grid muy tenue `rgba(255,255,255,0.06)`.
- **Bar chart:** barras radius 8px, gradiente vertical cian. No barras planas grises.
- **Donut:** anillo grueso, cian vs púrpura, centro con % blanco grande + label uppercase.
- **Mapa:** dot matrix (puntos), markers con halo circular pulsante. No mapa satélite realista.
- **Progress / HP:** track `--void-800`, fill con gradiente del recurso, glow en el extremo derecho del fill, radius full.

## 7. Decoración de card (referencia 1)

- Cluster de **4 dots** (2×2) en la esquina superior derecha de algunas cards: control de “widget”, no hamburger.
- Dividers: `1px` `rgba(255,255,255,0.08)`, nunca negros.
- Icono lineal cian en contenedor circular 36–40px con glow débil.

## 8. Lo que no es un material de este sistema

- Sombra material-design gris suave sobre blanco.
- Neumorphism claro.
- Acrylic Windows 11 gris.
- Cristal tan transparente que el texto baila sobre el bokeh (subir opacidad del well).
- Glow de 80px en todo el panel (parece mancha).
