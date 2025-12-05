// migrations/20251205213000_create_events_table.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('events', (t) => {
        t.string('id').primary(); // UUID
        t.string('name').notNullable();
        t.text('description').nullable();
        t.integer('boost_percent').notNullable().defaultTo(0); // porcentaje de bonus
        t.timestamp('start_at').notNullable();
        t.timestamp('end_at').notNullable();
        t.string('status').notNullable().defaultTo('active'); // active | paused
        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('events');
};

