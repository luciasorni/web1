const express = require('express');
const path = require('path');
const app = express();

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor iniciado en http://localhost:${PORT}`));
