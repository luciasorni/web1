/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('aircraft_types', (t) => {
        t.string('id').primary(); // puedes usar UUID o códigos tipo "A320"

        t.string('name').notNullable();        // nombre del modelo
        t.string('role').notNullable();        // 'passengers', 'cargo', 'attack', 'recon', ...

        t.integer('base_price').notNullable(); // precio estándar de compra

        t.text('description').nullable();      // descripción opcional

        t.boolean('is_active').notNullable().defaultTo(true); // si está disponible en catálogo

        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('aircraft_types');
};

