# Proyecto web1
Juan Federico García, Inés Del Río, Jesús Joana, Lucía Sorní

# SkyPort v2 – Instrucciones de instalación y ejecución

Proyecto desarrollado en Node.js + Express + SQLite3.

## 2. Requisitos previos

Antes de instalar y ejecutar SkyPort v2 es necesario disponer de los siguientes componentes:

### 2.1. Entorno de ejecución

- **Node.js** (versión 18 o superior recomendada)
    - Incluye `npm`, que se usará para instalar las dependencias del proyecto.
- **Navegador web moderno**
    - Cualquier navegador actual (Chrome, Edge, Firefox…) es válido para acceder a la aplicación.

### 2.2. Base de datos

- La aplicación utiliza **SQLite3** como motor de base de datos.
- No es necesario instalar un servidor de base de datos externo (MySQL, PostgreSQL, etc.).
- La base de datos se almacena en un **fichero local** dentro del proyecto (por ejemplo `db/skyport.sqlite3`), que se crea y/o inicializa mediante las migraciones y seeds de **Knex**:

    - Migraciones: crean las tablas necesarias.
    - Seeds: insertan datos de ejemplo (usuario demo, flota de aviones, misiones…).

> En resumen: basta con tener Node.js instalado; el motor SQLite3 se gestiona a través del paquete `sqlite3` de Node y los scripts de Knex incluidos en el proyecto.

### 2.3. Sistema de sesiones (Redis)

La aplicación está preparada para gestionar las sesiones de usuario usando **Redis** como almacén de sesiones.

- **Opción recomendada (con Redis)**
    - Instalar desde PowerShell, como administradores "Memurai" (Redis para windows): (winget install -e --id Memurai.MemuraiDeveloper)
    - Añadir el path: [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\ProgramFiles\Memurai", "Machine")
    - Comprobar que todo está instalado correctamente: (& "C:\Program Files (x86)\Memurai\memurai-cli.exe" ping). Deberá constestar PONG
    - Ver puerto en que se está ejecutando el servicio: (netstat -ano | findstr 6379)
    - Tener instalado y ejecutándose un servidor Redis local:
        - Host: `localhost`
        - Puerto por defecto: `6379`
    - En el fichero `.env` se indica la URL de conexión, por ejemplo:
      ```env
      REDIS_URL=redis://localhost:6379
      ```
- **Opción alternativa (sin Redis)**
    - Si no se dispone de Redis, la aplicación puede configurarse para usar un **almacén de sesiones en memoria** (solo para desarrollo / pruebas).
    - En este caso, se puede:
        - Dejar vacía o comentar la variable `REDIS_URL` en el `.env`.
        - La configuración de sesiones detectará que no hay Redis y utilizará el `MemoryStore` de `express-session`.

> Recomendación: para un entorno real se usaría Redis; para la corrección de la práctica es suficiente que funcione con sesiones en memoria si el servidor Redis no está disponible.

## 3. Contenido del proyecto

(pequeño resumen de carpetas: /app.js, /db, /routes, /views, /public…)

## 4. Instalación

1. Clonar / descomprimir
2. Ir a carpeta del proyecto
3. `npm install`
4. Copiar `.env.example` → `.env`

## 5. Inicialización de la base de datos

npx knex migrate:latest     # aplica migraciones
npx knex seed:run

## 6. Ejecución

npm start