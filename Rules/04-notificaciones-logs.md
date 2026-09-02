# Notificaciones, recompensas, penalizaciones y logs

Fuente: `Design/07-motion.md`, `Design/08` (System Message, log row), `Design/09` P10–P13, `Design/11-voz-del-sistema.md`.

## MUST — semántica de color (no negociable)

| Tipo | Color | CTA |
|---|---|---|
| System / info | Cian | `btn-neon` Acknowledge |
| Reward / loot / achievement | Naranja–oro | `btn-energy` Claim |
| Penalty / fine / death | `--danger` | Outline danger Acknowledge |
| Level-up | Magenta + oro | `btn-energy` o neon |
| Combat tick | Rojo en barras, no cinematic salvo muerte | — |

## MUST — tres capas

1. **Cinematic** (z-70): Reward y Penalty. Overlay void 72%, card cristal, título Orbitron `REWARD` / `PENALTY`, 1–2 frases del Sistema, item/efecto, CTA. Reward puede tener burst de partículas 600ms. Penalty: flash de borde 80ms, sin confeti.
2. **Toast/banner** (z-60): System Message 360–520px. Auto 4.5s, pausa on hover.
3. **Lista + log**: persistencia. Unread = fill cian 5% + pip. Log en JetBrains Mono con tag `[REWARD]` `[PENALTY]` `[SYSTEM]` `[COMBAT]`.

Disparar las tres cuando el Master otorga loot en modo Reward: cinematic al crawler, unread en campana, línea de log (Master y crawler).

## MUST — copy

Headers de cinematic en inglés LitRPG (`REWARD`, `PENALTY`, `SYSTEM MESSAGE`, `YOU ARE DEAD`). Cuerpo en el idioma de la UI. Tono: The System (sarcástico, corto). Prohibido “Oops”, “Success!”, emojis.

Toasts: título ≤ 42 caracteres, cuerpo ≤ 110.

## SHOULD

- Master que dispara el evento **no** está obligado a ver el cinematic completo; ve confirmación en dashboard + log.
- Log Master: filtros crawler / piso / tipo / tiempo, auto-scroll, drawer de detalle.
- Log Crawler: solo lo suyo + anuncios de piso.
- Línea nueva de log: highlight cian 12% que muere en 1.2s.

## NEVER

- Toast verde Material “Saved successfully”.
- Reward y Penalty con el mismo color.
- Confetti library, globos, GIFs.
- Glitch permanente en penalizaciones (máx. 2 frames en el título).
- Meter el log en un `console` look blanco o en cards de Twitter.

## Encadenado al implementar “asignar recurso”

```
confirm → write inventory/stats → write event
       → push notification unread
       → if mode === reward → cinematic reward
       → if mode === penalty → cinematic penalty
       → if mode === silent → solo log + lista
```
