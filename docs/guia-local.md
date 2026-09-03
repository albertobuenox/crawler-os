# Guía para levantar Crawler OS en tu Mac

Esta guía sirve si **no programas a diario**. Sigue los pasos en orden. No te saltes el 2 ni el 3: sin ellos el resto falla.

Al final tendrás la app abierta en el navegador, con cuentas de prueba listas.

---

## Qué vas a montar (en cristiano)

Crawler OS son **dos piezas** que tienen que estar encendidas a la vez:

1. **La base de datos** (Supabase en local). Ahí viven las cuentas, las sesiones y lo que se ve en tiempo real.
2. **La web** (Next.js). Es lo que abres en Chrome: `http://localhost:3000`.

Docker es el programa que “enciende” la base de datos en tu Mac, como si fuera un ordenador pequeño dentro del tuyo.

---

## 1. Instalar Node.js

Node es el motor que ejecuta la web en tu Mac.

1. Abre [https://nodejs.org](https://nodejs.org).
2. Descarga la versión **LTS** (la recomendada, número 20 o 22).
3. Abre el instalador, pulsa siguiente, siguiente, instalar.
4. Cuando termine, **cierra y vuelve a abrir** Terminal (si ya la tenías abierta).

Para comprobarlo:

1. Pulsa `Cmd + Espacio`, escribe **Terminal**, Enter.
2. Copia esto, pégalo y pulsa Enter:

```bash
node -v
```

Tiene que salir algo como `v20.x.x` o `v22.x.x`. Si dice `command not found`, Node no está instalado o hay que cerrar Terminal y abrirla otra vez.

---

## 2. Instalar Docker Desktop

1. Entra en [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/).
2. Descarga **Docker Desktop for Mac**.
   - Chip **Apple** (M1/M2/M3/M4): opción Apple Silicon.
   - Mac antiguo con Intel: opción Intel.
3. Abre el `.dmg`, arrastra Docker a Aplicaciones.
4. Abre **Docker** desde Aplicaciones. La primera vez pide permisos: acéptalos.
5. Espera a que el icono de la ballena (arriba a la derecha, en la barra del Mac) deje de animarse. Tiene que estar **quieto**. Eso significa que Docker ya está listo.

Si Docker no está abierto, el siguiente paso fallará. Déjalo abierto siempre que vayas a usar la app.

---

## 3. Abrir la carpeta del proyecto

En Terminal:

```bash
cd "/Users/albertobuenox/Desktop/03- DEV/CARL/crawler-os"
```

Si el proyecto está en otro sitio, cambia esa ruta. Truco: escribe `cd ` (con un espacio) y **arrastrá la carpeta `crawler-os` desde Finder a la Terminal**. Se pega la ruta sola.

Para comprobar que estás dentro:

```bash
ls
```

Deberías ver `package.json`, `README.md` y una carpeta `src`.

---

## 4. Instalar las dependencias (solo la primera vez)

Sigue en la misma Terminal, dentro de `crawler-os`:

```bash
npm install
```

Tarda uno o dos minutos. Descarga las librerías de la app. Si termina sin texto rojo enorme, está bien. Los avisos amarillos (`warn`) se pueden ignorar.

---

## 5. Arrancar la base de datos local

Docker tiene que estar **abierto** (ballena quieta).

```bash
npm run setup:local
```

La **primera vez** descarga unos cuantos gigas y puede tardar 5–15 minutos. No cierres Terminal.

Cuando acaba, verás algo como:

```
Listo. .env.local apunta a http://127.0.0.1:54321
Cuentas de prueba (contraseña: crawleros)
  Dungeon Master      dm@crawler.local
  ...
Arranca la app: npm run dev
```

Si sale `Docker Desktop tiene que estar en marcha`: abre Docker, espera a la ballena, y vuelve a ejecutar el mismo comando.

---

## 6. Arrancar la web

En la misma carpeta:

```bash
npm run dev
```

Cuando esté listo verás una línea parecida a:

```
▲ Next.js ...
- Local: http://localhost:3000
```

**No cierres esa ventana de Terminal.** Si la cierras, la web se apaga.

Abre el navegador y entra en:

[http://localhost:3000](http://localhost:3000)

Te llevará a la pantalla de login.

---

## 7. Entrar con las cuentas de prueba

En el login, abajo, hay botones de **prueba local**. O escríbelo a mano.

Contraseña de todas: **`crawleros`**

| Quién | Correo | Después de entrar |
|---|---|---|
| Dungeon Master | `dm@crawler.local` | Panel de control (`/dm`) |
| Crawler 1 | `crawler1@crawler.local` | Unirse con código **`FLOOR-TEST`** |
| Crawler 2 | `crawler2@crawler.local` | Igual: **`FLOOR-TEST`** |
| Mesa TV | no hace falta cuenta | [http://localhost:3000/table/FLOOR-TEST](http://localhost:3000/table/FLOOR-TEST) |

Para probar el tiempo real (varios a la vez):

1. Chrome normal → Dungeon Master.
2. Una ventana de **incógnito** → Crawler 1 (así no se mezclan las sesiones).
3. Otra pestaña → Mesa TV.

Si el Dungeon Master pide una tirada o pone texto en la mesa, el crawler y la TV deberían enterarse **sin recargar**.

---

## Cada día que quieras volver a abrirla

No hace falta repetir la instalación.

1. Abre **Docker Desktop** y espera a la ballena.
2. Abre Terminal, entra en la carpeta:

```bash
cd "/Users/albertobuenox/Desktop/03- DEV/CARL/crawler-os"
```

3. Si ayer apagaste el Mac o cerraste Docker, enciende la base de datos:

```bash
npm run db:start
```

4. Arranca la web:

```bash
npm run dev
```

5. Navegador: [http://localhost:3000](http://localhost:3000)

---

## Cómo apagarlo

En la Terminal donde corre `npm run dev`, pulsa `Ctrl + C` (sí, Control, no Cmd). La web se para.

Para apagar también la base de datos:

```bash
npm run db:stop
```

Luego puedes salir de Docker Desktop si quieres.

---

## Si algo sale mal

**`command not found: npm` o `node`**  
Node no está instalado, o hay que cerrar Terminal y abrirla de nuevo después de instalarlo.

**`Docker Desktop tiene que estar en marcha`**  
Abre Docker y espera a que la ballena deje de moverse.

**`npm run setup:local` se queda mucho rato la primera vez**  
Normal. Está bajando imágenes. Si pasa de 20 minutos sin avanzar, revisa que Docker esté abierto y que tengas internet.

**El navegador dice “no se puede conectar” a localhost:3000**  
No está corriendo `npm run dev`, o lo cerraste. Vuelve al paso 6.

**Login no entra / “The System no reconoce a este crawler”**  
Usa exactamente `dm@crawler.local` y contraseña `crawleros`. Si tocaste la base de datos, recréala:

```bash
npm run db:reset
```

**El crawler entra pero no tiene ficha**  
Únete con el código **`FLOOR-TEST`** (mayúsculas). En el Dungeon Master, en Crawlers, tienen que existir Carl y Donut.

**La mesa / los dados no se actualizan en el otro navegador**  
Confirma que los dos usan `localhost:3000` (no otro puerto) y que `npm run setup:local` terminó bien. Recarga las dos pestañas una vez.

**Cambiaste cosas de la base de datos y está raro**  
Esto borra datos de prueba y deja Carl, Donut y `FLOOR-TEST` otra vez:

```bash
npm run db:reset
```

---

## Qué no hace falta tocar

- No hace falta Vercel ni “subir a internet”.
- No hace falta editar `.env.local` a mano si usaste `npm run setup:local`.
- No hace falta crear cuentas en supabase.com para esta guía.

Cuando la Terminal está con `npm run dev` y Docker abierto, el servidor local está levantado.
