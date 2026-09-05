# Arquitectura de información

## Mapa de navegación

```
Login
 ├─ Master shell
 │   ├─ Dashboard (sesión)
 │   ├─ Crawlers
 │   │   ├─ Hoja
 │   │   └─ Inventario
 │   ├─ Objetos
 │   │   ├─ Equipo / Consumible / Misceláneo
 │   │   └─ Cajas de loot
 │   ├─ PNJs
 │   ├─ Mobs
 │   ├─ Recursos
 │   │   ├─ Mapas, logros, misiones, estados
 │   │   └─ Asignar
 │   ├─ Pisos / World
 │   ├─ Notificaciones (disparar + historial)
 │   ├─ Log global
 │   └─ Settings
 └─ Crawler shell
     ├─ HUD Home
     ├─ Personaje
     ├─ Inventario
     ├─ Notificaciones
     ├─ Log personal
     └─ Settings
```

## Permisos visuales

| Superficie | Master | Crawler |
|---|---|---|
| Crear recurso | sí | no existe en nav |
| Editar stats | sí | no; valores en solo lectura |
| Ver HP de otros | sí | solo party si el Master lo permite |
| Grant/Fine | sí | no |
| Log global | sí | no |
| Cinematic reward | dispara | recibe |
| Código de sala | genera | introduce |

Si el crawler no puede, **no se muestra el control**. No botones disabled “porque no eres Master”.

## Flujos críticos

### A. Grant loot

Dashboard o Crawler card → Grant → picker item → picker targets → modo Reward → copy opcional → confirmar → cinematic en clientes de los targets + log `[REWARD]` + inventario actualizado + unread en campana.

### B. Penalty

Igual con modo Penalty. Puede restar HP, oro, item, o aplicar estado. Cinematic rojo + log `[PENALTY]`.

### C. Crear y asignar recurso nuevo

Recursos → Nuevo → Editor → Guardar → Asignar (flujo A o B o silent).

### D. Combate / tick (si el Master lo usa)

Dashboard → acción “resolver daño” → elige crawler y cantidad → barras animan → si HP 0, estado dead + banner jugador.

### E. Login crawler a sala

Login rol Crawler → código → el Master ya tiene el crawler creado → el jugador “posee” esa hoja.

## Información en tiempo (casi) real

Prioridad de push:

1. Death / wipe
2. Penalty
3. Reward / level-up
4. System announce (nuevo piso)
5. Log line
6. KPI dashboard

La UI del crawler puede permitirse 200–400ms de animación. El Master dashboard debe reflejar el estado sin cinematic obligatorio (él ya lo disparó).

## Nombres de secciones (copy de nav)

Usar términos del Sistema, no de SaaS.

| Evitar | Usar |
|---|---|
| Users | Crawlers |
| Dashboard | Session / Floor Control |
| Products | Resources / Loot |
| Notifications inbox | The System |
| Activity feed | Event Log |
| Profile | Character Sheet |
| Admin | Master |

## Contenido mínimo por entidad

**Crawler:** nombre, portrait, nivel, raza, clase, atributos, HP/MP/STA, estados, inventario, log.

**Item:** nombre, rareza, tipo, slot, stats, descripción Sistema, flags.

**Evento:** timestamp, tipo, actor (Master/System/Crawler), target, payload, mensaje.

**Notificación:** tipo, unread, cinematic_shown, event_id.

## Principio de densidad

El Master optimiza para **control** (tablas, filtros, atajos).  
El Crawler optimiza para **inmersión** (HUD, cinematics, poco chrome).  
Nunca al revés: no le des al jugador un backoffice, ni al Master un menú de videojuego sin datos.
