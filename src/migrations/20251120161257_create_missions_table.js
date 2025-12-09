/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('missions', (t) => {
        t.string('id').primary(); // UUID o ID que tú generes

        t.string('name').notNullable();  // nombre de la misión

        // Tipo de misión: 'passengers', 'cargo', 'attack', 'recon', etc.
        t.string('type').notNullable();

        // Economía básica
        t.integer('cost').notNullable();    // coste al iniciar
        t.integer('reward').notNullable();  // recompensa si sale bien

        // Duración máxima de la misión en segundos
        t.integer('duration_seconds').notNullable();

        t.text('description').nullable();

        // Nivel mínimo de aeropuerto/jugador requerido
        t.integer('level_required').notNullable().defaultTo(1);

        // Si está disponible en el catálogo
        t.boolean('is_active').notNullable().defaultTo(true);

        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('missions');
};
