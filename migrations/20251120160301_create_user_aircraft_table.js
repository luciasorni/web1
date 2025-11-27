/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('user_aircraft', (t) => {
        t.string('id').primary(); // UUID del avión concreto

        // Dueño del avión
        t.string('user_id').notNullable()
            .references('id').inTable('users')
            .onDelete('CASCADE');

        // Modelo del catálogo
        t.string('aircraft_type_id').notNullable()
            .references('id').inTable('aircraft_types')
            .onDelete('RESTRICT');

        // Estado: 'idle', 'active', 'maintenance'
        t.string('status').notNullable().defaultTo('idle');

        // Info económica
        t.integer('purchased_price').notNullable();   // precio al que lo compró el jugador
        t.timestamp('purchased_at').notNullable();    // cuándo lo compró

        t.timestamp('sold_at').nullable();            // cuándo lo vendió (si lo vendió)
        t.integer('sold_price').nullable();           // precio de venta (si lo vendió)

        // Nombre opcional que le pone el jugador
        t.string('nickname').nullable();

        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('user_aircraft');
};

