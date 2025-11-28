// routes/index.js
const express = require('express');
const path = require('path');

// Creamos un router
const router = express.Router();

// Helper para resolver rutas dentro de /views (tener en cuenta que __dirname devuelve la ruta en donde se encuentra este archivo)
const v = (...segs) => path.join(__dirname, '..', 'views', ...segs);

// Este es el router que primero se mira (de acuerdo con el orden establecido en app.js)

// ---------- Sirve la página principal ----------
router.get('/', (req, res) => {
    res.sendFile(v('index.html'));
});

// ---------- PLANTILLAS DEL GRUPO AUTH ----------
router.get('/login',    (req, res) => res.sendFile(v('auth', 'login.html')));
router.get('/register', (req, res) => res.sendFile(v('auth', 'register.html')));
router.get('/recover',  (req, res) => res.sendFile(v('auth', 'recover.html')));

// Alias por compatibilidad si tenías /guest en la navbar:
router.get('/guest', (req, res) => res.redirect('/explore'));

// ---------- PLANTILLAS DEL GRUPO EXPLORE ----------
router.get('/explore',            (req, res) => res.sendFile(v('explore', 'explore.html')));
router.get('/explore/username',   (req, res) => res.sendFile(v('explore', 'username.html')));

// PLANTILLAS PRIVADAS o SOLO ACCESIBLES UNA VEZ AUTENTICADOPERFIL CONCRETO ---------------------------------------------------------------------

// PLANTILLAS DEL GRUPO GAME
router.get('/game',(req, res) => res.sendFile(v('game', 'game.html')));
router.get('/game/chat',(req, res) => res.sendFile(v('game', 'chat.html')));
router.get('/game/economy', (req, res) => res.sendFile(v('game', 'economy.html')));
router.get('/game/fleet', (req, res) => res.sendFile(v('game', 'fleet.html')));
router.get('/game/market', (req, res) => res.sendFile(v('game', 'market.html')));
router.get('/game/missions', (req, res) => res.sendFile(v('game', 'missions.html')));
router.get('/game/social', (req, res) => res.sendFile(v('game', 'social.html')));

// PLANTILLAS DEL GRUPO ADMIN - REQUIEREN UN ROLE DE ADMIN
router.get('/admin/users', (req, res) => res.sendFile(v('admin', 'users.html')));
router.get('/admin/events', (req, res) => res.sendFile(v('admin', 'events.html')));

module.exports = router;

