const express = require('express');
const router = express.Router();

// Página principal
router.get('/', (req, res) => {
  res.render('index');
});

// Página de login
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// Página de registro
router.get('/register', (req, res) => {
  res.render('auth/register');
});

// Página para invitados
router.get('/guest', (req, res) => {
  res.render('auth/guest');
});

// Página para recuperación de contraseña
router.get('/recover', (req, res) => {
  res.render('auth/recover');
});

module.exports = router;
