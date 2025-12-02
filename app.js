// app.js
require('dotenv').config();

// Para poder encender un modo LAN con HTTPS para probar chat/muro desde varios ordenadores.
const fs = require('fs');          // Para leer los certificados HTTPS desde disco
const http = require('http');      // Servidor HTTP "normal" (modo dev local)
const https = require('https');    // Servidor HTTPS (modo pruebas en LAN)

// En config/sessions: Ahi reside la política central (nombre de cookie, timeouts, URL de Redis, etc.).
const { timeouts } = require('./config/sessions');

// Otros middleware requeridos
const express = require('express');
const path = require('path');
const morgan = require('morgan');

// Se crea una instancia de Express -> instancia del servidor web
const app = express();

// BLOQUE DE PARSERS
/*
    Parsea el cuerpo de peticiones con Content-Type: application/json.
        Qué te da: req.body como objeto JS.
        Si el JSON es inválido: responde 400 Bad Request
        Tamaño por defecto: ~100 KB (puedes cambiarlo: express.json({ limit: '1mb' })).
 */
app.use(express.json());

/*
    Parsea cuerpos con Content-Type: application/x-www-form-urlencoded (lo que envían los formularios HTML por defecto).
        Qué te da: req.body con los campos del formulario.
        extended:
            false → usa querystring (básico, sin anidamiento real).
            true → usa qs (permite objetos/arrays anidados tipo user[name]=Julio o tags[]=a&tags[]=b).
        Tamaño por defecto: ~100 KB (se cambia igual: express.urlencoded({ extended: true, limit: '1mb' })).
 */
app.use(express.urlencoded({ extended: true }));


// BLOQUE DE SESIÓN <- Imprescindible este bloque antes de montar rutas
/*
    Para todas las peticiones, antes de llegar a mis rutas, pasa por este middleware de sesión.
    Ahí es donde se hace:
        - leer la cookie que manda el navegador
        - verificar que está bien firmada
        - sacar el session ID (SID)
        - ir a Redis a buscar la sesión
        - cargarla en req.session
        - y renovarla si corresponde
*/

// Middleware de sesión centralizado (Express)
const sessionMiddleware = require('./middleware/session');

// Aplica el middleware de sesión a todas las peticiones HTTP normales
app.use(sessionMiddleware);


/*
    app.use(express.static(...)) -> Middleware de express que vamos a configurar
    Se utiliza para servir estáticos (css, img, ..., etc). Esto no aplica a sendFile(). Pero si aplica a todos
    los estáticos referenciados en un archivo ".html" enviado mediante sendFile.
        - Todos los estáticos servidos por express.static (CSS, JS, imágenes, fuentes, etc.) reciben:
            - Cache-Control: public,
            - max-age=7d en producción (y 0 en dev),
            - ETag y Last-Modified en true
        - LA los ".html" servidos por express.static ja función setHeaders() les sobrescribe la cabecera y pone
        - Cache-Control: no-store, es decir: no se cachean (ni por el navegador ni por proxies).
    En resumen: se establece una 'cache' fuerte para assets, nada de 'caché' para HTML.
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
    Se monta router para servir Views (HTML)
        - En la práctica, ese router sirve las vistas HTML (GET a /, /login, /register, /explore, etc.).
        - Si llega, por ejemplo, /api/auth/me, también entra en este router primero, pero como dentro no habrá rutas /api/...,
        - hará passthrough (no coincide nada y cae al siguiente app.use()).
 */
app.use('/', require('./routes/index'));


/*
    Se monta router para gestionar rutas y otros subrouters del API SkyPort (JSON)
        - Solo entra si la URL empieza por /api
        - Aquí definimos los endpoints JSON: GET /api/auth/me, POST /api/auth/login, POST /api/auth/register, etc
 */
app.use('/api', require('./routes/api/index'));


// Healthcheck
app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('txt').send('ok');
});

// Tratamiento errores de primer nivel

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
    res.status(500).json({ error: 'Internal error' });
});

/*
    PORT:
    - Puerto base para la app (por defecto 4000).
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Skyport DEV en http://localhost:${PORT}`);
});