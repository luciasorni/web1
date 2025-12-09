// knexfile.js (ubicado en la RAÍZ del proyecto)

/*
    Este fichero 👉 Lo usa el CLI de Knex, es decir, los comandos que lanzamos en terminal:
        - npx knex migrate:latest
        - npx knex migrate:rollback
        - npx knex seed:run

    Cuando ejecutamos esos comandos, Knex no carga la app, no hace require('./db/knex'). En lugar de eso,
    mira exclusivamente el fichero knexfile.js de la raíz. Por eso aquí indicamos:
        Qué BD usar (client, connection.filename)
        Dónde están las migraciones
        Dónde están los seeds
        Y los entornos (development, production, etc.)
 */


const path = require('path');

module.exports = {
    development: {
        client: 'sqlite3',
        connection: {
            filename: path.join(__dirname, 'src', 'db', 'skyport.sqlite3')
        },
        useNullAsDefault: true,
        migrations: { directory: path.join(__dirname, 'src', 'migrations') },
        seeds: { directory: path.join(__dirname, 'src', 'seeds') }
    }
    // Más adelante añadiremos "production" con Postgres si así lo decidimos.
};
