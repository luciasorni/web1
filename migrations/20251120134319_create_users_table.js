// migrations/xxxx_create_users_table.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('users', (t) => {
        t.string('id').primary();                 // UUID

        t.string('username').notNullable().unique();
        t.string('email').notNullable().unique();

        t.string('password_hash').notNullable();

        t.text('roles').notNullable().defaultTo('[]');  // JSON string: ["user", "admin"]

        t.boolean('is_active').notNullable().defaultTo(true);

        // Saldo actual del jugador
        t.integer('current_balance').notNullable().defaultTo(0);

        // Último login (nullable)
        t.timestamp('last_login_at').nullable();

        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('users');
};

