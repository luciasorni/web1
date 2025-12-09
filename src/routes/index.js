// routes/index.js
const express = require('express');
const path = require('path');
const { requireAuthPage, requireRolePage } = require('../middleware/auth');

// Creamos un router
const router = express.Router();

// Helper para resolver rutas dentro de /views (tener en cuenta que __dirname devuelve la ruta en donde se encuentra este archivo)
const v = (...segs) => path.join(__dirname, '..', 'views', ...segs);

// Este es el router que primero se mira (de acuerdo con el orden establecido en app.js)

// ---------- Sirve la página principal ----------
router.get('/', (req, res) => {
    if (req.session?.destroy) {
        req.session.destroy(() => {});
    }
    res.sendFile(v('index.html'));
});

// ---------- Dossier del proyecto ----------
router.get('/presentacion', (req, res) => res.sendFile(v('presentation.html')));

// ---------- PLANTILLAS DEL GRUPO AUTH ----------
router.get('/login',    (req, res) => res.sendFile(v('auth', 'login.html')));
router.get('/register', (req, res) => res.sendFile(v('auth', 'register.html')));
router.get('/recover',  (req, res) => res.sendFile(v('auth', 'recover.html')));

// Alias por compatibilidad si tenías /guest en la navbar:
router.get('/guest', (req, res) => res.redirect('/explore'));

// ---------- PÁGINAS LEGALES ----------
router.get('/legal/terminos',   (req, res) => res.sendFile(v('legal', 'terminos.html')));
router.get('/legal/privacidad', (req, res) => res.sendFile(v('legal', 'privacidad.html')));

// ---------- PLANTILLAS DEL GRUPO EXPLORE ----------
router.get('/explore',            (req, res) => res.sendFile(v('explore', 'explore.html')));
router.get('/explore/username',   (req, res) => res.sendFile(v('explore', 'username.html')));

// PLANTILLAS PRIVADAS o SOLO ACCESIBLES UNA VEZ AUTENTICADO PERFIL CONCRETO ---------------------------------------------------------------------

// PLANTILLAS DEL GRUPO GAME
router.get('/game',          requireAuthPage, (req, res) => res.sendFile(v('game', 'game.html')));
router.get('/game/chat',     requireAuthPage, (req, res) => res.sendFile(v('game', 'chat.html')));
router.get('/game/economy',  requireAuthPage, (req, res) => res.sendFile(v('game', 'economy.html')));
router.get('/game/fleet',    requireAuthPage, (req, res) => res.sendFile(v('game', 'fleet.html')));
router.get('/game/market',   requireAuthPage, (req, res) => res.sendFile(v('game', 'market.html')));
router.get('/game/missions', requireAuthPage, (req, res) => res.sendFile(v('game', 'missions.html')));
router.get('/game/social',   requireAuthPage, (req, res) => res.sendFile(v('game', 'social.html')));

// PLANTILLAS DEL GRUPO ADMIN - REQUIEREN UN ROLE DE ADMIN
router.get('/admin',        requireRolePage('admin'), (req, res) => res.redirect('/admin/users'));
router.get('/admin/users',  requireRolePage('admin'), (req, res) => res.sendFile(v('admin', 'users.html')));
router.get('/admin/events', requireRolePage('admin'), (req, res) => res.sendFile(v('admin', 'events.html')));

module.exports = router;
