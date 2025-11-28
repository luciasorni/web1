// middleware/session.js
// --------------------------------------------------------------
// Middleware de sesión de Express centralizado.
// Crea req.session y gestiona la cookie asociada, utilizando Redis
// como almacén persistente de sesiones. Se importa en app.js
// mediante: app.use(require('./middleware/session'));
//
// Mantiene toda la lógica fuera de app.js para dejarlo más limpio,
// --------------------------------------------------------------

// middleware/session.js
// --------------------------------------------------------------
// Middleware de sesión de Express centralizado.
// --------------------------------------------------------------
require('dotenv').config();

const session = require('express-session');
const { createClient } = require('redis');
const { RedisStore } = require('connect-redis');  // 👈 v9: named export

// Import de config/sessions.js: La política central (nombre de cookie, timeouts, URL de Redis, etc.)
const { DEV, timeouts, cookieOptions, redisConfig } = require('../config/sessions');

// En modo desarrollo, muestra la política de sesión completa (útil para depurar)
if (DEV) {
    console.log('[SessionPolicy]', {
        idleMs: timeouts.idleMs,
        absoluteMs: timeouts.absoluteMs,
        cookie: cookieOptions(),
        redis: redisConfig
    });
}

// 1) Cliente Redis apuntando a redis://localhost:6379 (o lo que diga REDIS_URL)
const redisClient = createClient({ url: redisConfig.url });

redisClient.on('error', (err) => console.error('[Redis] Error', err));

redisClient.connect().catch(err => console.error('[Redis] No conecta:', err));

// 2) Exporta el middleware listo para usar en app.js
module.exports = session({
    name: cookieOptions().name,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: cookieOptions().cookie,
    store: new RedisStore({
        client: redisClient,
        prefix: redisConfig.prefix,
        ttl: Math.floor(timeouts.idleMs / 1000)   // segundos de vida por inactividad
    })
});
