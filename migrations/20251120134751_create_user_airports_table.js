/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('user_airports', (t) => {
        t.string('id').primary(); // UUID

        // Dueño del aeropuerto: un usuario
        t.string('user_id').notNullable()
            .references('id').inTable('users')
            .onDelete('CASCADE')
            .unique(); // un aeropuerto por usuario

        t.string('name').notNullable();   // nombre del aeropuerto del jugador
        t.integer('level').notNullable().defaultTo(1); // nivel inicial
        t.integer('xp').notNullable().defaultTo(0);    // experiencia acumulada

        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('user_airports');
};

