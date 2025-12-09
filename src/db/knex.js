// db/knex.js

/*
    Este archivo prepara y configura la conexión a SQLite usando Knex
    para el CÓDIGO de la app.

    Ojo: aquí NO usamos knexfile.js.
    knexfile.js se usa solo para la CLI de Knex (migraciones, seeds en terminal).

    Desde cualquier parte del proyecto podremos hacer:
        const knex = require('../db/knex');

    Y luego:
        knex('users').insert({ ... })
        knex('users').where({ id: 3 }).first()
 */

const path = require('path');
const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: path.join(__dirname, 'skyport.sqlite3')
    },
    useNullAsDefault: true
});

module.exports = knex;


/*
    🤔 ¿Y qué NO hace este fichero?
        No crea tablas (eso lo hacen las migraciones).
        No mete datos (eso lo hacen seeds o queries desde tu app).
        No gestiona transacciones por sí solo (pero Knex sí puede hacerlo si se lo pides).
        No abre conexiones persistentes (SQLite no trabaja con “pools”).
 */