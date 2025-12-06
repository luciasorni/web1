// app.js

// Para la carga en memoria del archivo de configuración de las variables de entorno .env
require('dotenv').config();

const fs = require('fs');          // Para leer los certificados HTTPS desde disco
const http = require('http');      // Servidor HTTP "normal" (modo dev local)
const https = require('https');    // Servidor HTTPS (modo pruebas en LAN)

// En "config/sessions" reside la política central de sesiones (nombre de cookie, timeouts, URL de Redis, etc.).
const { timeouts } = require('./config/sessions');

/*
    Se importa la clase Server de socket.IO. Es el Servidor de Socket.IO para WebSockets/eventos en tiempo real.
        - Socket.IO es el “motor” de WebSockets para SkyPort del lado servidor.
        - Posteriormente: "new Server(server, ...)" enganchará el servidor de sockets al servidor HTTP.
 */
const { Server } = require('socket.io');


// Otros middleware requeridos para funcionalidad diversas.
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');

// Se crea una instancia de Express -> instancia del servidor web
const app = express();

/*
    Para indicar a Express si debe fiarse de los encabezados que añade un proxy (Nginx, Cloudflare, Load Balancer…)
    como X-Forwarded-For, X-Forwarded-Proto.
    Se usa únicamente en el caso de que en producción la aplicación va detrás de proxy/TLS tipo Nginx/Cloudflare/Ingress):
 */
// app.set('trust proxy', 1);           <- Caso de un solo proxy delante (Nginx/ELB habitual)
// app.set('trust proxy', true);        <- Caso de varias capas (CDN + LB + Nginx): para 2 (o más), simplemente:confíar en toda la cadena

// Logs - Se configuran los logs que muestra la aplicación (fundamental para depuración)
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// OPCIONES DE SEGURIDAD - CONFIGURACIÓN -------------------------------

/*
    Express por defecto envía una cabecera: "X-Powered-By: Express"
        Con app.disable('x-powered-by'); hace que no se envíe. Evita pistas a un posible atacante.
        Se denomina "security by obscurity" (Cuantos menos datos des sobre tu stack, mejor).
 */
app.disable('x-powered-by');

/*
    Lo siguiente lo utilizamos para Content Security Policy (CSP), que es la política que dice:
        - “Mi página solo puede cargar scripts, estilos, imágenes, etc. desde estos sitios.”
        - Eso limita muchos ataques de XSS (inyección de scripts)
 */
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,      // añade un conjunto de políticas seguras por defecto,
        directives: {           // Sobrescribimos / amplíamos con directives.
                                // Origen propio por defecto
            "default-src": ["'self'"],      // “Por defecto, solo carga recursos desde mi propio servidor.”

            // Controlamos desde dónde se pueden cargar scripts JavaScript: propio + jsDelivr (Bootstrap bundle y Chart.js)
            "script-src": ["'self'", "https://cdn.jsdelivr.net"],

            // Controlamos desde dónde se pueden cargar Estilos: propio + jsDelivr + Google Fonts CSS
            // (añadimos 'unsafe-inline' por posibles estilos inline de Bootstrap)
            "style-src": ["'self'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "'unsafe-inline'"],

            // Controlamos desde dónde se pueden cargar Fuentes: propio + Google Fonts files
            "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],

            // Controlamos desde dónde se pueden cargarImágenes (logo local y data URIs)
            "img-src": ["'self'", "data:"],

            // Controlamos desde dónde se pueden cargar Conexiones XHR/fetch: propio + Twelve Data + jsDelivr (para .map)
            "connect-src": ["'self'", "https://api.twelvedata.com", "https://cdn.jsdelivr.net"],

            // Controla el uso de <object>, <embed>, <applet>, etc. No los permitimos
            "object-src": ["'none'"],

            // Controla desde dónde se pueden crear Web Workers / Service Workers:
            "worker-src": ["'self'", "blob:"],
        }
    },
}));

// Compresión de los datos enviados
app.use(compression());

// BLOQUE DE PARSERS
/*
    Parsea body con "Content-Type: application/json".
        Qué te da: req.body como objeto JS.
        Si el JSON es inválido: responde 400 Bad Request
        Tamaño por defecto: ~100 KB (se puede cambiar utilizando: express.json({ limit: '1mb' })).
 */
app.use(express.json());

/*
    Parsea body con "Content-Type: application/x-www-form-urlencoded" (lo que envían los formularios HTML por defecto).
        Qué te da: req.body con los campos del formulario.
        extended:
            false → usa querystring (básico, sin anidamiento real).
            true → usa qs (permite objetos/arrays anidados tipo user[name]=Julio o tags[]=a&tags[]=b).
        Tamaño por defecto: ~100 KB (se cambia igual: express.urlencoded({ extended: true, limit: '1mb' })).
 */
app.use(express.urlencoded({ extended: true }));

// INICIO DEL BLOQUE DE SESIÓN <- Este bloque debe ir SIEMPRE antes de montar cualquier ruta ==========================

/*
    Para todas las peticiones, antes de llegar a mis rutas, pasa por este middleware de sesión.
    Hace las siguientes tareas:
        - leer la cookie que manda el navegador
        - verificar que la cookie está bien firmada
        - sacar el session ID (SID)
        - ir a Redis a buscar la sesión
        - cargarla en req.session
        - y renovarla si corresponde
*/

// Middleware de sesión centralizado (Express, se reutiliza en Socket.IO)
const sessionMiddleware = require('./middleware/session');

// Aplica el middleware de sesión a todas las peticiones HTTP normales
app.use(sessionMiddleware);

/*
    Middleware para revisar si la sesión tiene iat (momento de inicio que se pone al hacer login).
    Si han pasado más de absoluteMs (p.ej. 24h), destruye la sesión aunque el usuario haya estado activo, y responde 401 session_expired.
    Si no, deja pasar (next()).
 */
app.use((req, res, next) => {
    const now = Date.now();
    if (req.session?.iat && (now - req.session.iat > timeouts.absoluteMs)) {
        return req.session.destroy(() => {
            res.status(401).json({ error: 'session_expired' });
        });
    }
    next();
});

// FIN DEL BLOQUE DE SESIÓN ==========================================================================================

/*
    app.use(express.static(...)) -> Middleware de express que vamos a configurar
    Se utiliza para servir estáticos (css, img, ..., etc). Esto no aplica a sendFile(). Pero si aplica a todos
    los estáticos referenciados dentro de un archivo "xxx.html" enviado mediante sendFile.
        - Todos los estáticos servidos por express.static (CSS, JS, imágenes, fuentes, etc.) reciben:
            - Cache-Control: public,
            - max-age=7d en producción (y 0 en dev),
            - ETag y Last-Modified en true
 */
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    etag: true,     // Hace que Express añada una cabecera HTTP con una especie de huella digital del archivo
    lastModified: true,     // Hace que Express añada una cabecera HTTP con la fecha de última modificación del archivo en disco (fs.stat.mtime).
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {       // No aplica cache a los archivos que terminan con html
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));

/*
    Se monta un primer router para servir Views (HTML)
        - En la práctica, ese router sirve las vistas HTML (GET a /, /login, /register, /explore, etc.).
        - Se hará passthrough al siguiente router en caso de no coincidir ninguna ruta.
 */
app.use('/', require('./routes/index'));

/*
    Se monta un segundo router para gestionar rutas y otros sub-routers dentro de el.
        - Solo entra si la URL empieza por /api
        - Aquí definimos los endpoints JSON: GET /api/auth/me, POST /api/auth/login, POST /api/auth/register, etc
 */
app.use('/api', require('./routes/api/index'));

// Healthcheck
app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('txt').send('ok');
});

// TRATAMIENTO DE ERRORES DE PRIMER NIVEL -----------------------------------------------------------------

// Recurso solicitado no encontrado - Error 404
app.use((req, res) => {
    res.set('Cache-Control', 'no-store');
    if (req.accepts('html')) {
        return res
            .status(404)
            .type('html')
            .send('<!doctype html><html><head><meta charset="utf-8"><title>404</title></head><body><h1>404 – Not Found</h1><p>La ruta solicitada no existe.</p></body></html>');
    }
    if (req.accepts('json')) {
        return res.status(404).json({ error: 'Not found' });
    }
    return res.status(404).type('txt').send('Not found');
});

// Error de parseado de un JSON- Error 500
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'JSON inválido' });
    }
    console.error('ERROR:', err);
    res.status(500).json({ error: 'Internal error' });
});

// --------------------------------------------------------
//  ARRANQUE DEL SERVIDOR (HTTP DEV LOCAL / HTTPS EN LAN)
// --------------------------------------------------------

/*
    PORT:
    - Puerto base para la app (por defecto 4000).
 */
const PORT = process.env.PORT || 3000;

/*
    SKYPORT_MODE:
    - 'dev':        Modo desarrollo local: solo HTTP, escuchando en localhost.
    - 'lan-https':  Modo pruebas en red local: HTTPS con certificado autofirmado, escuchando en 0.0.0.0.
                    (útil para probar funcionalidades tipo chat/muro con los equipos en la misma LAN).

    Cómo arrancar desde PowerShell (ejemplos):

    # Desarrollo "normal" (tú solo en tu máquina)
    $env:SKYPORT_MODE="dev"
    node app.js

    # Pruebas en red local (otros PCs / portátil / móvil)
    $env:SKYPORT_MODE="lan-https"
    node app.js
*/
const MODE = process.env.SKYPORT_MODE || 'dev';

let server; // Será el servidor HTTP de Node. Le decimos: “para cada petición que llegue, pásasela a mi app Express”.
            // Es decir, Express se cuelga dentro de este servidor HTTP./

if (MODE === 'dev') {
    /*
        MODO dev:
        - Servidor HTTP "normal".
        - Solo escucha en localhost (127.0.0.1). Solo accesible desde la propia máquina.
        - Pensado para pruebas durante el desarrollo de la aplicación: el desarrollador solo en su equipo.
    */
    server = http.createServer(app).listen(PORT, '127.0.0.1', () => {
        console.log(`Skyport DEV en http://localhost:${PORT}`);
    });

} else if (MODE === 'lan-https') {
    /*
        MODO LAN-HTTPS:
        - Servidor HTTPS con certificado AUTOFIRMADO.
        - Escucha en 0.0.0.0 para aceptar conexiones de toda la red local.
        - Pensado para pruebas desde varios ordenadores (chat/muro, etc.).

        Requiere que existan estos archivos (RUTA RELATIVA A ESTE app.js):
            ./certs/key.pem
            ./certs/cert.pem

        Los archivos (key.pem, cert.pem) los generamos con OpenSSL (en la raíz del proyecto):
            mkdir certs
            openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem ^
                -days 365 -nodes -subj "/CN=192.168.1.103"

        (Deberá sustituirse 192.168.1.103 por la IP local de la máquina servidora en la red LAN en que nos encontremos).

        Desde otro PC de la red entrarías a: https://192.168.1.103:4000 (o la que corresponda)

        Nota: El navegador avisará de que el certificado no es de confianza (autofirmado):
                Deberemos "Aceptar el riesgo" / "continuar igualmente" SOLO para las pruebas.
    */

    // path a los certificados autofirmados
    const certsPath = path.join(__dirname, 'certs');

    // Opciones para https
    const httpsOptions = {
        key: fs.readFileSync(path.join(certsPath, 'key.pem')),
        cert: fs.readFileSync(path.join(certsPath, 'cert.pem')),
    };

    server = https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
        console.log(`Skyport LAN en https://0.0.0.0:${PORT}`);
        console.log('Accede desde otro equipo con: https://<IP_DE_ESTA_MAQUINA>:' + PORT);
    });

} else {
    /*
        Fallback por si alguien pone un SKYPORT_MODE raro:
        - Nos comportamos como antes: HTTP escuchando en 0.0.0.0.
    */
    server = http.createServer(app).listen(PORT, '0.0.0.0', () => {
        console.log(`Skyport (modo desconocido: ${MODE}) en http://0.0.0.0:${PORT}`);
    });
}


// Cierre ordenado y seguro del servidor - Evita que queden puertos y procesos mal cerrados y liberados
require('./utils/gracefulShutdown')(server, { timeoutMs: 8000 });

// --------------------------------------------------------
//  SOCKET.IO ƒ?" CHAT GLOBAL NO PERSISTENTE
// --------------------------------------------------------
const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next);

const io = new Server(server, {
    cors: { origin: true, credentials: true },
});

// Reutiliza la misma sesiÇün que Express para saber quiÇ¸n envÇða mensajes
io.use(wrap(sessionMiddleware));

// AutenticaciÇün bÇ­sica: requiere sesiÇün vÇ­lida
io.use((socket, next) => {
    const sess = socket.request.session;
    if (!sess?.userId) return next(new Error('unauthorized'));
    socket.user = {
        id: sess.userId,
        name: sess.userName || 'Jugador',
    };
    next();
});

io.on('connection', (socket) => {
    // Informa al cliente de su identidad actual
    socket.emit('chat:ready', {
        userId: socket.user.id,
        userName: socket.user.name,
    });

    socket.on('chat:message', (payload = {}) => {
        const raw = typeof payload.text === 'string' ? payload.text.trim() : '';
        if (!raw) return;
        const text = raw.slice(0, 500);
        const msg = {
            text,
            userId: socket.user.id,
            userName: socket.user.name,
            ts: Date.now(),
        };
        io.emit('chat:message', msg);  // global broadcast
    });
});

