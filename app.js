const express = require('express');
const path = require('path');

const app = express();

// Motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos (CSS, imágenes, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
