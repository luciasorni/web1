/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('user_missions', (t) => {

        t.string('id').primary();          // UUID de esta misión instanciada

        // Relación con el usuario
        t.string('user_id').notNullable()
            .references('id').inTable('users')
            .onDelete('CASCADE');

        // Relación con la misión-plantilla
        t.string('mission_id').notNullable()
            .references('id').inTable('missions')
            .onDelete('RESTRICT');

        // Relación con el avión usado
        t.string('aircraft_id').notNullable()
            .references('id').inTable('user_aircraft')
            .onDelete('RESTRICT');

        // Estado de la misión
        t.string('status').notNullable().defaultTo('running');
        // Ej.: running, success, failed, cancelled

        // Tiempos
        t.timestamp('started_at').notNullable();
        t.timestamp('finished_at').nullable();

        // Economía (guardamos valores históricos)
        t.integer('cost_at_start').notNullable();
        t.integer('reward_on_success').notNullable();

        // Flags de si se aplicó el coste/recompensa
        t.boolean('cost_applied').notNullable().defaultTo(false);
        t.boolean('reward_applied').notNullable().defaultTo(false);

        t.text('failure_reason').nullable();

        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('user_missions');
};

