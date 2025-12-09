// data/fleetStore/db.js
const knex = require('../../db/knex');

// --- Flota del usuario ---
async function getFleetForUser(userId) {
    return knex('user_aircraft')
        .join('aircraft_types', 'user_aircraft.aircraft_type_id', 'aircraft_types.id')
        .where('user_aircraft.user_id', userId)
        .select(
            'user_aircraft.id as id',
            'user_aircraft.nickname as nickname',
            'user_aircraft.status as status',
            'user_aircraft.purchased_price as purchasedPrice',
            'user_aircraft.purchased_at as purchasedAt',
            'aircraft_types.id as typeId',
            'aircraft_types.role as role',
            'aircraft_types.name as model',
            'aircraft_types.base_price as basePrice',
            'aircraft_types.description as description'
        );
}

// --- Catálogo completo de tipos de aviones ---
async function getAllAircraftTypes() {
    return knex('aircraft_types')
        .select(
            'id',
            'role',
            'name as model',
            'base_price as basePrice',
            'description'
        )
        .where({ is_active: 1 });
}

// Helper: saldo actual usando account_movements
async function getUserBalance(trx, userId) {
    const row = await trx('account_movements')
        .where({ user_id: userId })
        .sum({ balance: 'amount' })
        .first();

    return Number(row?.balance) || 0;
}

/**
 * Compra un avión para el usuario (máximo 5 en flota)
 */
async function buyAircraftForUser({ userId, aircraftTypeId }) {
    return knex.transaction(async (trx) => {
        // 0) Limite de flota (max 6) - solo cuenta aviones operativos
        const ownedRow = await trx('user_aircraft')
            .where({ user_id: userId })
            .whereIn('status', ['idle', 'maintenance', 'running'])
            .count({ c: '*' })
            .first();

        const ownedCount = Number(ownedRow?.c ?? ownedRow?.['count(*)'] ?? 0);
        if (ownedCount >= 6) {
            const err = new Error('Fleet limit reached');
            err.code = 'FLEET_LIMIT';
            throw err;
        }

        // 1) Tipo de avión
        const type = await trx('aircraft_types')
            .where({ id: aircraftTypeId })
            .first();

        if (!type) {
            const err = new Error('Aircraft type not found');
            err.code = 'TYPE_NOT_FOUND';
            throw err;
        }

        // 2) Usuario (validar que existe)
        const user = await trx('users')
            .where({ id: userId })
            .first();

        if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
        }

        // 3) Saldo actual y precio
        const price = Number(type.base_price) || 0;
        const currentCredits = await getUserBalance(trx, userId);

        if (currentCredits < price) {
            const err = new Error('Insufficient credits');
            err.code = 'INSUFFICIENT_CREDITS';
            throw err;
        }

        const newCredits = currentCredits - price;

        // 4) Apunte contable: gasto por compra de avión
        await trx('account_movements').insert({
            id: `buy_${userId}_${Date.now()}_${aircraftTypeId}`,
            user_id: userId,
            type: 'aircraft_purchase',
            amount: -price,
            description: `Compra avión ${type.name} (${type.id})`,
            related_aircraft_id: aircraftTypeId,
            related_mission_id: null
            // created_at se rellena con CURRENT_TIMESTAMP
        });

        // 5) Actualizar current_balance (cache rápida)
        await trx('users')
            .where({ id: userId })
            .update({ current_balance: newCredits });

        // 6) Insertar nuevo avión en user_aircraft
        const newAircraftId = `ua_${userId}_${Date.now()}_${aircraftTypeId}`;

        await trx('user_aircraft').insert({
            id: newAircraftId,
            user_id: userId,
            aircraft_type_id: aircraftTypeId,
            status: 'idle',
            purchased_price: price,
            purchased_at: new Date().toISOString()
        });

        // 7) Leer avión ya enriquecido con aircraft_types
        const newAircraft = await trx('user_aircraft')
            .join('aircraft_types', 'user_aircraft.aircraft_type_id', 'aircraft_types.id')
            .where('user_aircraft.id', newAircraftId)
            .select(
                'user_aircraft.id as id',
                'user_aircraft.nickname as nickname',
                'user_aircraft.status as status',
                'user_aircraft.purchased_price as purchasedPrice',
                'user_aircraft.purchased_at as purchasedAt',
                'aircraft_types.id as typeId',
                'aircraft_types.role as role',
                'aircraft_types.name as model',
                'aircraft_types.base_price as basePrice',
                'aircraft_types.description as description'
            )
            .first();

        return {
            aircraft: newAircraft,
            credits: newCredits
        };
    });
}

/**
 * Vende un avion propiedad del usuario:
 *  - valida propiedad
 *  - calcula precio de reventa (70% del precio de compra o base)
 *  - borra de user_aircraft
 *  - ingresa créditos en account_movements + users.current_balance
 */
async function sellAircraftForUser({ userId, aircraftId }) {
    return knex.transaction(async (trx) => {
        const aircraft = await trx('user_aircraft')
            .join('aircraft_types', 'user_aircraft.aircraft_type_id', 'aircraft_types.id')
            .where('user_aircraft.id', aircraftId)
            .andWhere('user_aircraft.user_id', userId)
            .select(
                'user_aircraft.id as id',
                'user_aircraft.nickname as nickname',
                'user_aircraft.status as status',
                'user_aircraft.purchased_price as purchasedPrice',
                'user_aircraft.purchased_at as purchasedAt',
                'aircraft_types.id as typeId',
                'aircraft_types.role as role',
                'aircraft_types.name as model',
                'aircraft_types.base_price as basePrice',
                'aircraft_types.description as description'
            )
            .first();

        if (!aircraft) {
            const err = new Error('Aircraft not found');
            err.code = 'AIRCRAFT_NOT_FOUND';
            throw err;
        }

        if (aircraft.status === 'running') {
            const err = new Error('Aircraft busy on mission');
            err.code = 'AIRCRAFT_BUSY';
            throw err;
        }

        const salePrice = Math.round((aircraft.purchasedPrice || aircraft.basePrice || 0) * 0.7);

        // saldo actual
        const currentCredits = await getUserBalance(trx, userId);
        const newCredits = currentCredits + salePrice;

        await trx('account_movements').insert({
            id: `sell_${userId}_${Date.now()}_${aircraftId}`,
            user_id: userId,
            type: 'aircraft_sell',
            amount: salePrice,
            description: `Venta avión ${aircraft.model} (${aircraft.typeId})`,
            related_aircraft_id: aircraftId,
            related_mission_id: null
        });

        await trx('users')
            .where({ id: userId })
            .update({ current_balance: newCredits });

        await trx('user_aircraft')
            .where({ id: aircraftId, user_id: userId })
            .del();

        return {
            removed: aircraft,
            credits: newCredits,
            salePrice
        };
    });
}

module.exports = {
    getFleetForUser,
    getAllAircraftTypes,
    buyAircraftForUser,
    sellAircraftForUser
};
