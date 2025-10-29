const express = require('express');
const path = require('path');
const app = express();

// Archivos estáticos (CSS, JS, imágenes, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas HTML
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor iniciado en http://localhost:${PORT}`));
