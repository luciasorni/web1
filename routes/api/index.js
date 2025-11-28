// routes/api/index.js

const express = require('express');
const router = express.Router();

/*
    Este primero es un middleware que se aplica a todas las rutas de este router. Hace dos cosas:
        1. "Cache-Control: no-store": indica que no se guarde copia en ningún caché (ni navegador, ni proxy).
            Es la política más estricta; ideal para endpoints sensibles (auth, datos personales) y para /api
            donde cada respuesta debe ser fresca.
        2. "next()": pasa el control al siguiente middleware/handler; este middleware no responde, solo ajusta la cabecera.
 */
router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// MONTAMOS SUBROUTERS POR DOMINIO FUNCIONAL: /api/auth, api/game, ....
// Admin (requiere el role de admin para poder entrar
router.use('/admin', require('./admin'));

// Auth (incluye login, register, recover, logout, etc...
router.use('/auth', require('./auth'));

// Explore (incluye ...
router.use('/explore', require('./explore'));

// Game (incluye chat, economy, fleet, game, market, missions, social
router.use('/game', require('./game'));


module.exports = router;