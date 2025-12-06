// data/missionsStore/db.js
const knex = require('../../db/knex');
const { randomUUID } = require('crypto');
const createId = () => randomUUID();

function mapMission(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        cost: row.cost,
        reward: row.reward,
        durationSeconds: row.duration_seconds,
        description: row.description,
        levelRequired: row.level_required,
        isActive: !!row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
/*
 * Misiones asociadas a un usuario (user_missions + missions)
 */
async function getMissionsForUser(userId) {
    return knex('user_missions')
        .join('missions', 'user_missions.mission_id', 'missions.id')
        .where('user_missions.user_id', userId)
        .select(
            // Campos de user_missions
            'user_missions.id as id',
            'user_missions.status as status',               // 'running', etc.
            'user_missions.started_at as startedAt',
            'user_missions.finished_at as finishedAt',
            'user_missions.cost_at_start as costAtStart',
            'user_missions.reward_on_success as rewardOnSuccess',
            'user_missions.cost_applied as costApplied',
            'user_missions.reward_applied as rewardApplied',
            'user_missions.failure_reason as failureReason',
            'user_missions.aircraft_id as aircraftId',

            // Campos de missions
            'missions.id as missionId',
            'missions.name as name',
            'missions.type as type',
            'missions.cost as cost',
            'missions.reward as reward',
            'missions.duration_seconds as durationSeconds',
            'missions.description as description',
            'missions.level_required as levelRequired'
        );
}

/*
 * Catálogo completo de misiones (tabla missions)
 */
async function getAllMissions() {
    return knex('missions')
        .where({ is_active: 1 }) // solo activas
        .select(
            'id',
            'name',
            'type',
            'cost',
            'reward',
            'duration_seconds as durationSeconds',
            'description',
            'level_required as levelRequired'
        )
        .orderBy('level_required', 'asc')
        .orderBy('name', 'asc');
}

// Catálogo completo (incluye inactivas) para admin
async function listAllMissionsAdmin() {
    const rows = await knex('missions')
        .select('*')
        .orderBy('created_at', 'desc');
    return rows.map(mapMission);
}

async function createMission({ name, type, cost, reward, durationSeconds, description, levelRequired = 1, isActive = true }) {
    const id = createId();
    const now = new Date().toISOString();

    await knex('missions').insert({
        id,
        name,
        type,
        cost,
        reward,
        duration_seconds: durationSeconds,
        description,
        level_required: levelRequired,
        is_active: isActive ? 1 : 0,
        created_at: now,
        updated_at: now
    });

    return mapMission({
        id, name, type, cost, reward,
        duration_seconds: durationSeconds,
        description,
        level_required: levelRequired,
        is_active: isActive ? 1 : 0,
        created_at: now,
        updated_at: now
    });
}

async function updateMission(id, payload) {
    if (!id) return null;
    const data = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.type !== undefined) data.type = payload.type;
    if (payload.cost !== undefined) data.cost = payload.cost;
    if (payload.reward !== undefined) data.reward = payload.reward;
    if (payload.durationSeconds !== undefined) data.duration_seconds = payload.durationSeconds;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.levelRequired !== undefined) data.level_required = payload.levelRequired;
    if (payload.isActive !== undefined) data.is_active = payload.isActive ? 1 : 0;

    if (!Object.keys(data).length) return null;

    data.updated_at = new Date().toISOString();

    const updated = await knex('missions')
        .where({ id })
        .update(data)
        .returning('*');

    const row = Array.isArray(updated) ? updated[0] : null;
    return mapMission(row);
}

async function deleteMission(id) {
    if (!id) return false;
    const deleted = await knex('missions').where({ id }).del();
    return deleted > 0;
}

/*
 * Activar mision
 */
async function activateMissionForUser({ userId, missionId }) {
    if (!userId || !missionId) {
        const err = new Error('Missing userId or missionId');
        err.code = 'BAD_INPUT';
        throw err;
    }

    // Transacción: todo o nada
    return knex.transaction(async (trx) => {
        // 1) Misión (solo activas)
        const mission = await trx('missions')
            .where({ id: missionId, is_active: 1 })
            .first();

        if (!mission) {
            const err = new Error('Mission not found or inactive');
            err.code = 'MISSION_NOT_FOUND';
            throw err;
        }

        // 2) Usuario
        const user = await trx('users')
            .where({ id: userId, is_active: 1 })
            .first();

        if (!user) {
            const err = new Error('User not found or inactive');
            err.code = 'USER_NOT_FOUND';
            throw err;
        }

        // 3) Saldo suficiente
        const cost = mission.cost || 0;
        const currentBalance = user.current_balance || 0;

        if (currentBalance < cost) {
            const err = new Error('Insufficient credits');
            err.code = 'INSUFFICIENT_CREDITS';
            throw err;
        }

        // 4) Buscar avión compatible del usuario (idle + rol compatible)
        const compatibleAircraft = await trx('user_aircraft as ua')
            .join('aircraft_types as at', 'ua.aircraft_type_id', 'at.id')
            .where('ua.user_id', userId)
            .andWhere('ua.status', 'idle')          // avión libre
            .andWhere('at.role', mission.type)      // rol compatible con tipo de misión
            .first('ua.id');

        if (!compatibleAircraft) {
            const err = new Error('No compatible aircraft for this mission');
            err.code = 'NO_COMPATIBLE_AIRCRAFT';
            throw err;
        }

        const aircraftId = compatibleAircraft.id;

        // 5) Calcular tiempos y resultado planificado
        const now = new Date();
        const nowIso = now.toISOString();

        const baseSeconds = mission.duration_seconds || 0;

        // factor aleatorio entre 0.8 y 1.2
        const factor = 0.8 + Math.random() * 0.4;
        const realSeconds = Math.max(1, Math.round(baseSeconds * factor));

        // hora de finalización planificada
        const plannedFinish = new Date(now.getTime() + realSeconds * 1000);
        const plannedFinishIso = plannedFinish.toISOString();

        // Regla de éxito: si tarda <= tiempo base → éxito; si tarda más → fracaso
        const willSucceed = realSeconds <= baseSeconds;

        // 6) IDs para las nuevas filas
        const userMissionId = createId();   // 👈 AHORA SÍ DEFINIDO
        const movementId    = createId();

        // 7) Crear user_missions (misión queda en 'running')
        await trx('user_missions').insert({
            id: userMissionId,
            user_id: userId,
            mission_id: mission.id,
            aircraft_id: aircraftId,
            status: 'running',
            started_at: nowIso,             // 👈 ISO
            finished_at: plannedFinishIso,  // 👈 ISO
            cost_at_start: mission.cost,
            reward_on_success: mission.reward,
            cost_applied: 1,                // ya cobramos el coste
            reward_applied: 0,              // la recompensa aún NO
            failure_reason: willSucceed ? null : 'planned_failure_timeout',
            created_at: nowIso,
            updated_at: nowIso
        });

        // 8) Movimiento contable por el coste (gasto)
        await trx('account_movements').insert({
            id: movementId,
            user_id: userId,
            created_at: nowIso,
            type: 'MISSION_ACTIVATE',
            amount: -cost,  // negativo = gasto
            description: `Activación misión "${mission.name}"`,
            related_aircraft_id: aircraftId,
            related_mission_id: mission.id
        });

        // 9) Actualizar saldo del usuario
        const newBalance = currentBalance - cost;

        await trx('users')
            .where({ id: userId })
            .update({
                current_balance: newBalance,
                updated_at: nowIso
            });

        // 10) Marcar avión como en uso (ocupado)
        await trx('user_aircraft')
            .where({ id: aircraftId })
            .update({
                status: 'running',
                updated_at: nowIso
            });

        // 11) Devolvemos resumen para el router / frontend
        return {
            userId,
            missionId: mission.id,
            userMissionId,
            movementId,
            newBalance,
            durationPlannedSeconds: baseSeconds,
            durationRealSeconds: realSeconds,
            plannedFinishedAt: plannedFinishIso,
            willSucceed
        };
    });
}


/*
 * Resolver la mision cuando toca
 */
async function resolveDueMissionsForUser({ userId }) {
    if (!userId) {
        const err = new Error('Missing userId');
        err.code = 'BAD_INPUT';
        throw err;
    }

    return knex.transaction(async (trx) => {
        const jsNow = new Date();
        const jsNowIso = jsNow.toISOString();

        const dbNowRow = await trx.raw('SELECT CURRENT_TIMESTAMP as now');
        console.log('[DEBUG] JS NOW ISO =', jsNowIso);
        console.log('[DEBUG] DB NOW      =', dbNowRow);

        const running = await trx('user_missions')
            .where('user_id', userId)
            .andWhere('status', 'running')
            .andWhere('reward_applied', 0);

        console.log('[DEBUG] running missions for user:', userId, running);

        const dueMissions = await trx('user_missions')
            .where('user_id', userId)
            .andWhere('status', 'running')
            .andWhere('reward_applied', 0)
            .andWhere('finished_at', '<=', jsNowIso);   // 👈 compara ISO vs ISO

        console.log('[DEBUG] due missions for user:', userId, dueMissions);

        if (!dueMissions.length) {
            const err = new Error('No due missions');
            err.code = 'NO_DUE_MISSIONS';
            throw err;
        }

        // 2) Cargar usuario
        const user = await trx('users')
            .where({ id: userId, is_active: 1 })
            .first();

        if (!user) {
            const err = new Error('User not found or inactive');
            err.code = 'USER_NOT_FOUND';
            throw err;
        }

        let balance = user.current_balance || 0;
        const now = new Date(Date.now());
        const resolved = [];

        // 3) Resolver cada misión
        for (const um of dueMissions) {
            const willSucceed = !um.failure_reason;  // null => éxito
            const reward = um.reward_on_success || 0;
            let rewardAppliedAmount = 0;

            if (willSucceed && reward > 0) {
                const movementId = createId();
                await trx('account_movements').insert({
                    id: movementId,
                    user_id: userId,
                    created_at: now,
                    type: 'MISSION_REWARD',
                    amount: reward, // positivo = ingreso
                    description: `Recompensa misión`,
                    related_aircraft_id: um.aircraft_id,
                    related_mission_id: um.mission_id
                });

                balance += reward;
                rewardAppliedAmount = reward;
            }

            const newStatus = willSucceed ? 'success' : 'failed';

            await trx('user_missions')
                .where({ id: um.id })
                .update({
                    status: newStatus,
                    reward_applied: willSucceed ? 1 : 0,
                    updated_at: now
                });

            // Liberar avión
            await trx('user_aircraft')
                .where({ id: um.aircraft_id })
                .update({
                    status: 'idle',
                    updated_at: now
                });

            resolved.push({
                userMissionId: um.id,
                missionId: um.mission_id,
                aircraftId: um.aircraft_id,
                success: willSucceed,
                rewardApplied: rewardAppliedAmount
            });
        }

        // 4) Actualizar saldo del usuario una sola vez
        await trx('users')
            .where({ id: userId })
            .update({
                current_balance: balance,
                updated_at: now
            });

        // 5) Devolvemos resumen
        return {
            userId,
            newBalance: balance,
            resolved
        };
    });
}




module.exports = {
    getMissionsForUser,
    getAllMissions,
    activateMissionForUser,
    resolveDueMissionsForUser,
    listAllMissionsAdmin,
    createMission,
    updateMission,
    deleteMission
};
