// migrations/20251210120000_create_social_tables.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
    // Solicitudes de amistad (pendiente/aceptada/declinada)
    await knex.schema.createTable('friend_requests', (t) => {
        t.string('id').primary();            // UUID
        t.string('from_user_id').notNullable().index();
        t.string('to_user_id').notNullable().index();
        t.string('status').notNullable().defaultTo('pending'); // pending | accepted | declined
        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.timestamp('responded_at').nullable();
    });

    // Relaciones de amistad (bidireccional)
    await knex.schema.createTable('friendships', (t) => {
        t.string('id').primary(); // UUID
        t.string('user_id_a').notNullable().index();
        t.string('user_id_b').notNullable().index();
        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.unique(['user_id_a', 'user_id_b']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
    await knex.schema.dropTableIfExists('friendships');
    await knex.schema.dropTableIfExists('friend_requests');
};
