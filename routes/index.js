// routes/index.js
const express = require('express');
const router = express.Router();

/**
 * GET /
 * Renderiza la página de inicio (views/index.ejs)
 */
router.get('/', (req, res) => {
  // Puedes pasar datos de ejemplo para las noticias si lo deseas:
  const news = [
    { title: 'Novedades en control de tráfico', date: '2025-10-29', excerpt: 'Resumen breve...' },
    { title: 'Lanzamiento de nuevo avión', date: '2025-10-24', excerpt: 'Breve extracto...' },
  ];

  res.render('index', { news });
});

/**
 * Rutas del menú (Inicio sesión / Registro / Invitado)
 * Actúan como "placeholders" — cámbialas a res.render('auth/login') si ya tienes esas vistas.
 */
router.get('../views/auth/login.html', (req, res) => {
  // Si tienes views/auth/login.ejs: descomenta la línea de abajo
  // return res.render('auth/login');
  return res.redirect('../views/auth/login.html');
});

router.get('../views/auth/register.html', (req, res) => {
  // return res.render('auth/register');
  return res.redirect('../views/auth/register.html');
});

router.get('../views/auth/guest.html', (req, res) => {
  // Lógica para usuario invitado: crear sesión temporal o redirigir
  // Ejemplo sencillo: redirigir a /guest-home (crea esa ruta si hace falta)
  return res.redirect('../views/auth/guest.html');
});

module.exports = router;
