# Prompts de generación de UI

Usar junto a las imágenes de `References/` como image prompt / style reference. Objetivo: generar pantallas coherentes con Crawler OS, no dashboards genéricos.

## Bloque de estilo (pegar siempre)

```
Futuristic holographic HUD UI, Sword Art Online system window aesthetic, isekai status interface,
dark navy-obsidian void background with soft purple and cyan radial glows and orange-pink bokeh orbs,
glassmorphism panels with frosted translucent cards, 20px rounded corners, thin cyan neon rim light
on top-left edges, inner white highlight, subtle cyan outer glow, layered nested dark wells inside glass,
electric cyan #00D4FF data, magenta #E879F9 identity accents, orange-to-pink gradient CTA buttons,
cyan neon outline buttons, crisp geometric sans typography, Orbitron-like HUD titles, huge cyan stat numbers
with tiny uppercase labels, thin line icons, no medieval fantasy, no pixel art, no cluttered cyberpunk
city, 1440x900, ultra-detailed UI mockup, cinematic lighting
```

Negative (si el generador lo admite):

```
white background, material design, flat bootstrap, comic, anime screenshot of characters,
stone parchment RPG, 8-bit, watermark, unreadable tiny text, heavy chromatic aberration, rain, rust
```

Adjuntar siempre las dos referencias de `References/`.

---

## Pantalla: Login

```
{BLOQUE DE ESTILO}
Centered 440px glass login card, title THE SYSTEM in wide futuristic caps, subtitle CRAWLER OS in cyan,
two large selectable tiles Master vs Crawler, Master tile cyan glow, Crawler tile magenta glow,
handle and passphrase fields in dark wells, bottom pill CTA orange-to-pink "ENTER THE DUNGEON",
empty dark space around card, particles behind, no other chrome
```

## Pantalla: Master Dashboard

```
{BLOQUE DE ESTILO}
Admin dungeon master dashboard inspired by media-kit layout: top title SESSION CONTROL,
purple-blue pill button INICIAR PISO, row of 4 KPI glass cards with cyan numbers,
large line chart cyan+magenta with glow dots, donut chart cyan vs purple,
bottom event log rows in jetbrains-mono, left icon rail with per-icon colored glows
```

## Pantalla: Character sheet

```
{BLOQUE DE ESTILO}
LitRPG character sheet HUD, left portrait in rounded glass with cyan ring,
name in HUD font, level gold chip, HP MP STA neon bars, six giant cyan attributes
STR STA AGI INT CHA PER with uppercase labels, lore well, skill chips, buff/debuff pills
```

## Pantalla: Inventory

```
{BLOQUE DE ESTILO}
RPG holographic inventory, 8x5 grid of 64px item slots with rarity colored neon borders
common grey uncommon green rare cyan epic purple legendary gold, selected item detail panel
on the right with orange CLAIM/EQUIP button, empty dashed slots
```

## Pantalla: Reward cinematic

```
{BLOQUE DE ESTILO}
Full-screen overlay dark 72%, center glass card, huge gold title REWARD, legendary item
icon with gold glow, sarcastic system subtitle, orange-pink pill CLAIM, small particle burst,
no character art
```

## Pantalla: Penalty cinematic

```
{BLOQUE DE ESTILO}
Same HUD overlay, title PENALTY in crimson neon, red rim light, no cute particles,
Acknowledge outline button, ominous
```

## Pantalla: Player mobile HUD

```
{BLOQUE DE ESTILO}
Mobile 390x844 Sword Art Online HUD, top HP MP bars, current floor objective card,
three notification rows, bottom nav 5 glowing icon tiles home character inventory bell log,
glass panels, bokeh background
```

## Cómo iterar

1. Generar a 1440 (desktop) o 390 (móvil).
2. Si sale “SaaS analytics”, reforzar “system window, SAO HUD, game UI overlay”.
3. Si sale anime con personajes, añadir “UI only, no characters, no faces except a small portrait frame”.
4. Recortar componentes (botón, slot, toast) y guardarlos en `References/` como nuevas refs de componente.
