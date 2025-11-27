/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('account_movements', (t) => {
        t.string('id').primary(); // UUID del movimiento

        // A qué jugador pertenece este movimiento
        t.string('user_id').notNullable()
            .references('id').inTable('users')
            .onDelete('CASCADE');

        t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

        // Tipo de movimiento:
        // 'initial_balance', 'aircraft_purchase', 'aircraft_sale',
        // 'mission_cost', 'mission_reward', 'maintenance_cost', etc.
        t.string('type').notNullable();

        // Importe: positivo = entra dinero, negativo = sale
        t.integer('amount').notNullable();

        // Texto explicativo
        t.text('description').nullable();

        // Enlaces opcionales a otras entidades
        t.string('related_aircraft_id').nullable()
            .references('id').inTable('user_aircraft')
            .onDelete('SET NULL');

        t.string('related_mission_id').nullable()
            .references('id').inTable('user_missions')
            .onDelete('SET NULL');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('account_movements');
};

