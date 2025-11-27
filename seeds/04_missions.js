// seeds/04_missions.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
    // 1) Limpieza de datos dependientes
    await knex('user_missions').del();
    await knex('missions').del();

    const now = new Date().toISOString();

    // 2) Inserción de misiones base
    await knex('missions').insert([
        // ==========================
        // COMMERCIAL - PASSENGER
        // ==========================
        {
            id: 'MIS_CP_001',
            name: 'Ruta regional de alta demanda',
            type: 'commercial_passenger',
            cost: 500,
            reward: 900,
            duration_seconds: 1800, // 30 min
            description: 'Vuelo regional con alta ocupación ideal para A320 o B738.',
            level_required: 1,
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'MIS_CP_002',
            name: 'Vuelo nacional en hora punta',
            type: 'commercial_passenger',
            cost: 1200,
            reward: 2200,
            duration_seconds: 5400, // 90 min
            description: 'Tramo nacional en franja de máxima demanda. Buen equilibrio riesgo/beneficio.',
            level_required: 2,
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'MIS_CP_003',
            name: 'Ruta intercontinental nocturna',
            type: 'commercial_passenger',
            cost: 4500,
            reward: 8000,
            duration_seconds: 28800, // 8 h
            description: 'Vuelo de largo radio con alta rentabilidad para B773.',
            level_required: 3,
            is_active: 1,
            created_at: now,
            updated_at: now
        },

        // ==========================
        // COMMERCIAL - CARGO
        // ==========================
        {
            id: 'MIS_CC_001',
            name: 'Envío urgente de paquetería',
            type: 'commercial_cargo',
            cost: 400,
            reward: 750,
            duration_seconds: 2700, // 45 min
            description: 'Carga urgente entre dos hubs regionales. Ideal para ATR72F o B738F.',
            level_required: 1,
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'MIS_CC_002',
            name: 'Corredor nocturno de carga',
            type: 'commercial_cargo',
            cost: 1500,
            reward: 2800,
            duration_seconds: 21600, // 6 h
            description: 'Operación nocturna de carga con ocupación media-alta.',
            level_required: 2,
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'MIS_CC_003',
            name: 'Operación logística intercontinental',
            type: 'commercial_cargo',
            cost: 5000,
            reward: 9500,
            duration_seconds: 32400, // 9 h
            description: 'Gran operación de mercancías a otro continente para B763F.',
            level_required: 4,
            is_active: 1,
            created_at: now,
            updated_at: now
        },

        // ==========================
        // MILITARY - TRANSPORT
        // ==========================
        {
            id: 'MIS_MT_001',
            name: 'Transporte de tropas a base avanzada',
            type: 'military_transport',
            cost: 2000,
            reward: 3800,
            duration_seconds: 7200, // 2 h
            description: 'Traslado de tropas a una base avanzada en zona delicada.',
            level_required: 3,
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'MIS_MT_002',
            name: 'Misión de ayuda humanitaria',
            type: 'military_transport',
            cost: 1500,
            reward: 3200,
            duration_seconds: 10800, // 3 h
            description: 'Entrega de material humanitario tras un desastre natural.',
            level_required: 2,
            is_active: 1,
            created_at: now,
            updated_at: now
        },

        // ==========================
        // MILITARY - ATTACK
        // ==========================
        {
            id: 'MIS_MA_001',
            name: 'Ataque de precisión táctico',
            type: 'military_attack',
            cost: 2200,
            reward: 4500,
            duration_seconds: 3600, // 1 h
            description: 'Misión de ataque con alta precisión sobre objetivos tácticos.',
            level_required: 4,
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'MIS_MA_002',
            name: 'Apoyo aéreo cercano',
            type: 'military_attack',
            cost: 1800,
            reward: 4000,
            duration_seconds: 5400, // 1.5 h
            description: 'Apoyo a unidades terrestres en combate cercano. Ideal para A-10 o F18.',
            level_required: 3,
            is_active: 1,
            created_at: now,
            updated_at: now
        },

        // ==========================
        // MILITARY - RECON
        // ==========================
        {
            id: 'MIS_MR_001',
            name: 'Vigilancia de frontera',
            type: 'military_recon',
            cost: 800,
            reward: 1700,
            duration_seconds: 14400, // 4 h
            description: 'Patrulla y vigilancia prolongada en zona fronteriza.',
            level_required: 2,
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'MIS_MR_002',
            name: 'Reconocimiento estratégico de larga duración',
            type: 'military_recon',
            cost: 2500,
            reward: 5200,
            duration_seconds: 43200, // 12 h
            description: 'Misión de reconocimiento continuo con RQ-4 o U2.',
            level_required: 5,
            is_active: 1,
            created_at: now,
            updated_at: now
        }
    ]);
};
