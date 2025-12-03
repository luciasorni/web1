// middleware/session.js
require('dotenv').config();

const session = require('express-session');
const { createClient } = require('redis');
const connectRedis = require('connect-redis');   // 👈 import genérico

// Import de config/sessions.js
const { DEV, timeouts, cookieOptions, redisConfig } = require('../config/sessions');

if (DEV) {
    console.log('[SessionPolicy]', {
        idleMs: timeouts.idleMs,
        absoluteMs: timeouts.absoluteMs,
        cookie: cookieOptions(),
        redis: redisConfig
    });
}

// 1) Cliente Redis
const redisClient = createClient({ url: redisConfig.url });

redisClient.on('error', (err) => console.error('[Redis] Error', err));
redisClient.connect().catch(err => console.error('[Redis] No conecta:', err));

// 2) Resolver la forma correcta de obtener RedisStore según versión
let RedisStore;

if (connectRedis.RedisStore) {
    // ✅ v9 (API nueva)
    RedisStore = connectRedis.RedisStore;
} else if (typeof connectRedis === 'function') {
    // ✅ versiones antiguas: require('connect-redis')(session)
    RedisStore = connectRedis(session);
} else if (connectRedis.default) {
    // ✅ algunos bundles usan .default
    RedisStore = connectRedis.default;
} else {
    throw new Error('No se ha podido resolver RedisStore desde connect-redis');
}

// 3) Exportar el middleware de sesión
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
        ttl: Math.floor(timeouts.idleMs / 1000)
    })
});
