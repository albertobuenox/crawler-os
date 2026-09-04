# Dados SVG

Hay cuatro series de origen (CorelDRAW, página A4):

| Serie | Archivos | Qué es |
| --- | --- | --- |
| Silueta facetada | `1.svg` … `7.svg` | Caras rellenas, huecos blancos, **sin números** |
| Silueta + número | `11.svg` … `77.svg` | Igual, con la cara visible numerada |
| Plano técnico | `111.svg` … `777.svg` | Contorno + números vectorizados |
| Wireframe | `1111.svg` … `7777.svg` | Solo aristas, sin números |

Mapeo de formas en cada serie:

| Índice | Dado |
| --- | --- |
| 1 / 11 / 111 / 1111 | d20 (cara 1) |
| 2 / 22 / 222 / 2222 | d20 (cara 20) |
| 3 / 33 / 333 / 3333 | d8 |
| 4 / 44 / 444 / 4444 | d10 |
| 5 / 55 / 555 / 5555 | d4 |
| 6 / 66 / 666 / 6666 | d12 (no está en la bandeja) |
| 7 / 77 / 777 / 7777 | d6 |

La UI usa la **serie 1** recortada y teñible (`currentColor`):

```
public/dice/d2.svg   moneda (no venía en el pack)
public/dice/d4.svg
public/dice/d6.svg
public/dice/d8.svg
public/dice/d10.svg
public/dice/d20.svg
```
