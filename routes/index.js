const express = require('express');
const path = require('path');
const router = express.Router();

// Página principal
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

// Página de login
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/auth/login.html'));
});

// Página de registro
router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/auth/register.html'));
});

// Página de invitado
router.get('/guest', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/auth/guest.html'));
});

// Página de recuperación de contraseña
router.get('/recover', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/auth/recover.html'));
});
// Página de administración de usuarios
router.get('/admin/users',  (req, res) => res.sendFile(v('admin/users.html')));
router.get('/admin/events', (req, res) => res.sendFile(v('admin/events.html')));

module.exports = router;
