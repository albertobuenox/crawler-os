# Visión de producto y estética

## Qué es la app

App de sesión para **Dungeon Crawler Carl**: login de **Dungeon Master** y **Jugadores**, registro de partida y juego en vivo.

El Dungeon Master administra el dungeon. Los crawlers (jugadores) viven dentro de The System: hoja de personaje, inventario, recompensas, penalizaciones y log de eventos.

## Roles

### Dungeon Master (DM)

Operador del Sistema. Ve más que los jugadores. Crea, edita, asigna y dispara eventos.

Capacidades:

- Recursos: objetos, consumibles, equipo, monstruos, NPCs, plantas, suelos/pisos, quests, logros, cajas, tablas de loot, razas, clases, estados, trampas.
- Asignación a jugadores, al grupo o al piso.
- Hojas de personaje (lectura/escritura total).
- Inventarios (añadir, quitar, romper, mejorar, transferir).
- Disparo de notificaciones: recompensa, penalización, anuncio de piso, muerte, revival, logro.
- Log de eventos global y filtrado por crawler / piso / tipo.
- Control de sesión: iniciar piso, pausar, tick de combate, otorgar XP, cambiar fase.

### Jugador (Crawler)

Ve su HUD personal. No crea recursos. Recibe lo que el Sistema le empuja.

Capacidades:

- Login y selección de crawler.
- Hoja de personaje (lectura; algunos campos pueden pedir al Dungeon Master).
- Inventario y equipo.
- Centro de notificaciones.
- Log personal (su punto de vista, no el omnisciente del Dungeon Master).
- Objetivos activos del piso.
- Party (si hay grupo).

## Personalidad visual

Nombre interno del lenguaje: **Crawler OS / The System HUD**.

Referentes:

- Sword Art Online: ventanas flotantes, barras de vida, menús de cuadrícula, bordes luminosos.
- Isekai System windows: paneles translúcidos, texto de “System Message”, popups de logro.
- Referencias locales: glassmorphism oscuro, cian eléctrico, magenta, naranja atardecer, glow de canto.

No es cyberpunk sucio (no rain, no glitch constante, no chrome oxidado).  
No es fantasy medieval (no pergaminos, no piedra, no runas de taberna).  
Sí es **HUD holográfico limpio**, con sarcasmo del Sistema en el copy, no en el layout.

## Metáfora de interfaz

El fondo es el vacío de la mazmorra (navy/obsidiana con partículas).  
Los paneles son cristales de interfaz proyectados.  
El cian es la voz del Sistema.  
El magenta es identidad del crawler (perfil, magia, party).  
El naranja/oro es recompensa, loot legendario, CTA de alta energía.  
El rojo es daño, penalización, muerte, alerta crítica.

## Promesa de sensación

Al abrir la app debe parecer que el jugador se ha puesto un visor y The System acaba de inyectarle el HUD. Cada card flota. Cada número brilla. Cada recompensa explota en naranja. Cada penalización corta en rojo.
