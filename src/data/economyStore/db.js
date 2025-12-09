// data/economyStore/db.js
// Acceso a la información económica del usuario (saldo + movimientos)

const knex = require('../../db/knex');

/**
 * Devuelve el saldo actual del usuario + todos sus movimientos
 * (ingresos/gastos) ordenados del más reciente al más antiguo.
 *
 * @param {string|number} userId
 * @returns {Promise<{ balance: number, movements: Array }>}
 */
async function getEconomyForUser(userId) {
    if (!userId) {
        const err = new Error('Missing userId');
        err.code = 'MISSING_USER_ID';
        throw err;
    }

    // 1) Obtener usuario para conocer el saldo actual (current_balance)
    const user = await knex('users')
        .where({ id: userId })
        .first();

    if (!user) {
        const err = new Error('User not found');
        err.code = 'USER_NOT_FOUND';
        throw err;
    }

    const balance = Number(user.current_balance) || 0;

    // 2) Obtener movimientos económicos
    // Tabla real: account_movements
    // Campos: id, user_id, created_at, type, amount, description,
    //         related_aircraft_id, related_mission_id
    const rows = await knex('account_movements')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc');

    const movements = rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,                    // se espera algo tipo 'income' | 'expense'
        amount: Number(r.amount) || 0,
        description: r.description || null,
        createdAt: r.created_at,         // lo enviamos tal cual, el front hace new Date(...)
        relatedAircraftId: r.related_aircraft_id || null,
        relatedMissionId:  r.related_mission_id  || null
    }));

    return { balance, movements };
}

module.exports = {
    getEconomyForUser
};
