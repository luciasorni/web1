/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
    // XP configurable en catálogo de misiones
    const hasXpReward = await knex.schema.hasColumn('missions', 'xp_reward');
    if (!hasXpReward) {
        await knex.schema.alterTable('missions', (t) => {
            t.integer('xp_reward').notNullable().defaultTo(0);
        });
    }

    // XP capturado en la instancia de misión del usuario
    const hasXpOnSuccess = await knex.schema.hasColumn('user_missions', 'xp_on_success');
    if (!hasXpOnSuccess) {
        await knex.schema.alterTable('user_missions', (t) => {
            t.integer('xp_on_success').notNullable().defaultTo(0);
        });
    }

    const hasXpApplied = await knex.schema.hasColumn('user_missions', 'xp_applied');
    if (!hasXpApplied) {
        await knex.schema.alterTable('user_missions', (t) => {
            t.boolean('xp_applied').notNullable().defaultTo(false);
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
    const hasXpReward = await knex.schema.hasColumn('missions', 'xp_reward');
    if (hasXpReward) {
        await knex.schema.alterTable('missions', (t) => {
            t.dropColumn('xp_reward');
        });
    }

    const hasXpOnSuccess = await knex.schema.hasColumn('user_missions', 'xp_on_success');
    if (hasXpOnSuccess) {
        await knex.schema.alterTable('user_missions', (t) => {
            t.dropColumn('xp_on_success');
        });
    }

    const hasXpApplied = await knex.schema.hasColumn('user_missions', 'xp_applied');
    if (hasXpApplied) {
        await knex.schema.alterTable('user_missions', (t) => {
            t.dropColumn('xp_applied');
        });
    }
};
