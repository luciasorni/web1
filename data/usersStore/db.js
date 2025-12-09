// data/usersStore/db.js

require('dotenv').config();
const knex = require('../../db/knex');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

// Adaptador: Convierte una fila de la base de datos al “formato JSON” que la app ya usa.
function mapRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        passwordHash: row.password_hash,          // <- viene como password_hash en BD
        roles: JSON.parse(row.roles || '[]'),    // <- en BD es texto JSON
        isActive: row.is_active,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapAirport(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        level: row.level,
        xp: row.xp
    };
}

async function findUsersByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const rows = await knex('users')
        .whereIn('id', ids);

    return rows.map(mapRow);
}


async function findUserByUsername(username) {
    const row = await knex('users').where({ username }).first();
    return mapRow(row);
}

async function findUserByEmail(email) {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return null;
    const row = await knex('users').where({ email: normalized }).first();
    return mapRow(row);
}

async function findUserById(id) {
    const row = await knex('users').where({ id }).first();
    return mapRow(row);
}

// Marca la última fecha de acceso del usuario
async function updateLastLoginAt(id, at = new Date().toISOString()) {
    if (!id) return null;
    const updated = await knex('users')
        .where({ id })
        .update({ last_login_at: at, updated_at: at })
        .returning('*');
    const row = Array.isArray(updated) ? updated[0] : null;
    return mapRow(row);
}

async function getAirportForUser(userId) {
    if (!userId) return null;
    const row = await knex('user_airports').where({ user_id: userId }).first();
    return mapAirport(row);
}

async function findUserWithAirportByUsername(username) {
    const row = await knex('users').where({ username }).first();
    if (!row) return null;
    const airport = await getAirportForUser(row.id);
    return { ...mapRow(row), airport };
}

async function searchUsers({ query = '', limit = 20 } = {}) {
    const q = (query || '').trim();
    const base = knex('users')
        .select('users.*')
        .orderBy('created_at', 'desc')
        .limit(limit);

    if (q) {
        base.where(builder => {
            builder.where('username', 'like', `%${q}%`)
                   .orWhere('email', 'like', `%${q}%`);
        });
    }

    const rows = await base;
    const users = rows.map(mapRow);
    const ids = users.map(u => u.id);

    if (!ids.length) return [];

    const airports = await knex('user_airports').whereIn('user_id', ids);
    const airportByUser = new Map(airports.map(a => [a.user_id, mapAirport(a)]));

    return users.map(u => ({ ...u, airport: airportByUser.get(u.id) || null }));
}

async function deleteUserById(id) {
    if (!id) return false;
    const deleted = await knex('users').where({ id }).del();
    return deleted > 0;
}
async function listUsers() {
    const rows = await knex('users')
        .select('id', 'username', 'email', 'roles', 'is_active', 'last_login_at', 'created_at', 'updated_at')
        .orderBy('created_at', 'desc');
    return rows.map(mapRow);
}

async function updateUser({ id, roles, isActive }) {
    const payload = {};
    if (roles) payload.roles = JSON.stringify(roles);
    if (typeof isActive === 'boolean') payload.is_active = isActive;
    if (Object.keys(payload).length === 0) return null;

    payload.updated_at = new Date().toISOString();

    const updated = await knex('users')
        .where({ id })
        .update(payload)
        .returning('*');

    const row = Array.isArray(updated) ? updated[0] : null;
    return mapRow(row);
}

// Actualiza la contraseña de un usuario concreto
async function updateUserPassword({ id, password }) {
    if (!id || typeof password !== 'string') return null;
    const passwordHash = await bcrypt.hash(password, 10);
    const updated_at = new Date().toISOString();

    await knex('users')
        .where({ id })
        .update({ password_hash: passwordHash, updated_at });

    return findUserById(id);
}

// Crea usuario + datos mínimos SkyPort (saldo, aeropuerto, avión, movimiento inicial)
async function createUser({ username, email, password, roles: rolesArg }) {
    const INITIAL_BALANCE = process.env.INITIAL_BALANCE || 100000;
    const START_AIRCRAFT_TYPE_ID = process.env.START_AIRCRAFT_TYPE_ID ||'A320_PASSENGER';
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const normalizedEmail = (email || '').trim().toLowerCase();
    const roles = Array.isArray(rolesArg) && rolesArg.length ? rolesArg : ['player']; // Roles por defecto

    /*
        ID de los recursos que se generan para el nuevo
        Este código es una template string de JavaScript.
            - Si id vale por ejemplo: id = '1f4b0f8f-3c8a-4c3d-8a9e-9f5a2a1a1234'
            - airportId  = `airport_${id}_1`;  hace que airportId quede: "airport_1f4b0f8f-3c8a-4c3d-8a9e-9f5a2a1a1234_1"
     */
    const airportId  = `airport_${id}_1`;
    const aircraftId = `aircraft_${id}_1`;
    const movementId = `mov_initial_balance_${id}`;

    /*
        knex.transaction(async trx => { ... }) Abre una transaccion en la base de datos
        Nos pasa un objeto especial (trx) que se comporta igual que knex, pero:
            - Todas las operaciones que hagamos con trx(...) van dentro de esa transacción.
        El flujo de una transacción es:
            - Knex abre una transacción en la BD: BEGIN TRANSACTION.
            - Hacemos los insert usando trx(...).
            - Si todas las operaciones han ido bien entonces
                  - Knex hace COMMIT → se guardan todos los cambios.
            - Si hay algún error (salta excepción, un insert falla, etc.):
                - Knex hace ROLLBACK → se deshacen todos los cambios.
     */
    await knex.transaction(async trx => {
        // 1) users
        await trx('users').insert({
            id,
            username,
            email: normalizedEmail,
            password_hash: passwordHash,          // <- columna en la tabla
            roles: JSON.stringify(roles),        // <- se guarda como texto
            is_active: true,
            current_balance: INITIAL_BALANCE,
            last_login_at: null,
            created_at: now,
            updated_at: now,
        });

        // 2) user_airports – aeropuerto base del usuario
        await trx('user_airports').insert({
            id: airportId,
            user_id: id,
            name: 'SkyPort Base',
            level: 1,
            xp: 0
        });

        // 3) user_aircraft – avión inicial
        await trx('user_aircraft').insert({
            id: aircraftId,
            user_id: id,
            aircraft_type_id: START_AIRCRAFT_TYPE_ID,
            status: 'idle',
            purchased_price: 50000,     // igual que en el seed del demo
            purchased_at: now,
            sold_at: null,
            sold_price: null,
            nickname: 'Starter Wings'
        });

        // 4) account_movements – saldo inicial
        await trx('account_movements').insert({
            id: movementId,
            user_id: id,
            created_at: now,
            type: 'initial_balance',
            amount: INITIAL_BALANCE,
            description: 'Saldo inicial de la cuenta.',
            related_aircraft_id: null,
            related_mission_id: null
        });
    });

    // Devolvemos el usuario nuevo creado en el mismo "formato JSON" de siempre
    return {
        id,
        username,
        email: normalizedEmail,
        passwordHash,
        roles,
        isActive: true,
        createdAt: now,
        updatedAt: now,
    };
}

module.exports = {
    findUserByUsername,
    findUserByEmail,
    findUserById,
    createUser,
    findUsersByIds,   // 🆕
    listUsers,
    updateUser,
    getAirportForUser,
    findUserWithAirportByUsername,
    searchUsers,
    deleteUserById,
    updateUserPassword,
    updateLastLoginAt
};
