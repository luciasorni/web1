// seeds/03_account_initial_credit.js

exports.seed = async function (knex) {
    const userId = 'user_demo_1';    // ajusta si tu usuario demo tiene otro id
    const initialAmount = 50000;     // créditos iniciales

    // 1) Apunte contable inicial
    await knex('account_movements').insert({
        id: `init_${userId}`,          // como tu PK es varchar(255), ponemos un id simple
        user_id: userId,
        type: 'initial_credit',        // texto libre, tu tipo de movimiento
        amount: initialAmount,         // entero positivo
        description: 'Crédito inicial de bienvenida',
        related_aircraft_id: null,
        related_mission_id: null
        // created_at tiene DEFAULT CURRENT_TIMESTAMP, no hace falta ponerlo
    });

    // 2) Sincronizar también el current_balance del usuario
    await knex('users')
        .where({ id: userId })
        .update({ current_balance: initialAmount });
};
