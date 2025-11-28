// config/sessions.js
// En este archivo reside la política central de las sesiones
require('dotenv').config();

// Si no estás en producción, estás en modo desarrollo. Lo usamos para relajar cosas como secure.
const DEV = (process.env.NODE_ENV !== 'production');

// Idle: tiempo máximo sin actividad antes de echarte. (minutos)
const idleMin = parseInt(process.env.SESSION_IDLE_MIN || '30', 10);

// Absolute: vida máxima total de la sesión, aunque estes interactuando. (horas)
const absoluteHrs = parseInt(process.env.SESSION_ABSOLUTE_HOURS || '24', 10);

// Función que convierte los tiempos anteriores a milisegundos
const timeouts = {
    idleMs: idleMin * 60 * 1000,
    absoluteMs: absoluteHrs * 60 * 60 * 1000
};

// Es el nombre de la cookie que el servidor envía al navegador
const COOKIE_NAME = process.env.SESSION_NAME || 'skyport.sid';

// Función que devuelve la política de la cookie de sesión
function cookieOptions() {
    return {
        name: COOKIE_NAME,
        cookie: {
            httpOnly: true,             // El JS del navegador no puede leer la cookie.
            secure: !DEV,               // si true, el navegador solo envía la cookie por HTTPS (nunca por HTTP)..
            sameSite: 'lax',            // Bloquea la mayoría de CSRF “accidentales o intencionados”.
            path: '/',                  // Válida para toda la web.
            maxAge: timeouts.idleMs     // Caduca si no hay actividad en ese tiempo (idle).
        }
    };
}

// Dónde está Redis y con qué prefijo guardar las sesiones:
const redisConfig = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: process.env.REDIS_PREFIX || 'sess:'
};
module.exports = {
    DEV,
    timeouts,
    cookieOptions,
    redisConfig
};
