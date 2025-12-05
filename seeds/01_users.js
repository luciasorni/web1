// seeds/01_users.js

exports.seed = async function (knex) {
    // Borramos cualquier usuario previo
    await knex('users').del();

    const now = new Date().toISOString();

    // Usuario de prueba principal
    await knex('users').insert({
        id: 'user_demo_1',
        username: 'demo',
        email: 'demo@skyport.local',
        // Hash bcrypt real de la contraseña: demo1234
        password_hash: '$2b$10$mDD8K9tL/BbRANwF/yh5p.wgTDnmlVy9bf4/eLhg3E9P8z9HQ/.ie',
        roles: JSON.stringify(['admin', 'player']),
        is_active: 1,
        current_balance: 10000,     // saldo inicial
        last_login_at: null,
        created_at: now,
        updated_at: now
    });
};
