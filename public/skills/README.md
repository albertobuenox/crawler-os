# Ilustraciones de habilidades

Las **utility skills** van en su carpeta. El slug del catálogo apunta al archivo (mayúsculas y espacios incluidos):

```
public/skills/utility/AIMING.webp
public/skills/utility/CAT-LIKE REFLEXES.webp
```

Las **attack skills** van en su propia carpeta, con el slug del catálogo:

```
public/skills/attack/<slug>.webp
```

Si no hay archivo en esas carpetas, se busca `public/skills/<slug>.webp`.

Ejemplos:

- `public/skills/attack/bow.webp`
- `public/skills/attack/wrasslin.webp`
- `public/skills/utility/ANIMAL-HANDLING.webp`
- `public/skills/utility/DODGE.webp`

Tamaño recomendado: cuadrado (256×256 o 512×512). Hasta que el archivo exista, la UI muestra un recuadro vacío.
