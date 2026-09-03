# Voz del Sistema

La UI se ve como un HUD de isekai. El texto suena como **The System** de Dungeon Crawler Carl: corporativo, cruel, a veces gracioso, nunca genérico de app de productividad.

## Registro

- Segunda persona al crawler: “You received…”, “You have been fined…”.
- Tercera persona en logs Master: `Carl received Box of Doom`.
- Español de interfaz (nav, botones, settings) **claro y corto**.
- Inglés opcional en *headers de Sistema* (`SYSTEM MESSAGE`, `REWARD`, `PENALTY`, `FLOOR ANNOUNCEMENT`) para el sabor LitRPG. El cuerpo va en el idioma de la UI.

No mezclar tono meme en labels de formulario (“Tu super-contraseña épica”). Los forms son serios. El Sistema se desata en **mensajes, empty states, recompensas y penalizaciones**.

## Vocabulario

| Concepto | Copy |
|---|---|
| Usuario jugador | Crawler |
| GM | Dungeon Master |
| Item otorgado | Reward / Loot |
| Castigo | Penalty / Fine |
| Piso | Floor |
| XP | Experience |
| Muerte | You are dead. |
| Log | Event Log |
| Inventario | Inventory |
| Hoja | Character Sheet |

## Plantillas

### Reward

```
REWARD
The System has decided you deserve a treat.
Probably by accident.
[Item name]
```

### Penalty

```
PENALTY
The System is not angry. The System is disappointed.
And also angry.
[Effect]
```

### Empty inventario

```
Nothing here but lint and poor decisions.
```

### Empty log

```
No events yet. The dungeon is watching.
```

### Error login

```
Access denied. The System does not recognize this crawler.
```

### Death

```
YOU ARE DEAD
Your remaining teammates may loot your corpse.
The System recommends they hurry.
```

## Microcopy de UI (neutro-Sistema)

- Botones: verbos de acción en mayúsculas suaves o title case: `Jack In`, `Enter the Dungeon`, `Claim`, `Acknowledge`, `Grant Loot`, `Assign`, `Save Resource`.
- No “Submit”, “OK”, “Click here”.
- Placeholders: `Crawler handle`, `Passphrase`, `Floor code`.

## Longitud

- Toast: título ≤ 42 caracteres, cuerpo ≤ 110.
- Empty state: 1 título + 1 frase.
- Lore de item: 1–3 frases. Puede ser sarcástico.
- No párrafos de 8 líneas en un toast.

## Lo que no se dice

- “Oops! Something went wrong.”
- “Welcome to our community.”
- “Unlock premium features.”
- Emojis en copy del Sistema (el glow ya es el énfasis). Un emoji en un System Message rompe el HUD.
