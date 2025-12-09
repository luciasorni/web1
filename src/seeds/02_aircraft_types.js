// seeds/02_aircraft_types.js

exports.seed = async function (knex) {
    // Borramos cualquier tipo de avión previo
    await knex('aircraft_types').del();

    const now = new Date().toISOString();

    await knex('aircraft_types').insert([
        // ==========================
        // MILITARY TRANSPORT
        // ==========================
        {
            id: 'C130',
            name: 'Lockheed C-130 Hercules',
            role: 'military_transport',
            base_price: 7000,
            description: 'Avión de transporte militar táctico para tropas y carga en pistas cortas.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'A400M',
            name: 'Airbus A400M Atlas',
            role: 'military_transport',
            base_price: 8500,
            description: 'Transporte militar de nueva generación para carga pesada y misiones tácticas.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'C17',
            name: 'Boeing C-17 Globemaster III',
            role: 'military_transport',
            base_price: 9500,
            description: 'Avión de transporte estratégico para grandes cargas a largas distancias.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },

        // ==========================
        // MILITARY ATTACK
        // ==========================
        {
            id: 'F16',
            name: 'F-16 Fighting Falcon',
            role: 'military_attack',
            base_price: 8000,
            description: 'Caza polivalente ligero para misiones de ataque y superioridad aérea.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'F18',
            name: 'F/A-18 Hornet',
            role: 'military_attack',
            base_price: 9000,
            description: 'Caza polivalente embarcado para misiones aire-aire y aire-superficie.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'A10',
            name: 'A-10 Thunderbolt II',
            role: 'military_attack',
            base_price: 7500,
            description: 'Avión de apoyo cercano especializado en ataque a objetivos en tierra.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },

        // ==========================
        // MILITARY RECON
        // ==========================
        {
            id: 'RQ4',
            name: 'Northrop Grumman RQ-4 Global Hawk',
            role: 'military_recon',
            base_price: 11000,
            description: 'Dron de gran altitud y largo alcance para reconocimiento estratégico.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'U2',
            name: 'Lockheed U-2',
            role: 'military_recon',
            base_price: 10500,
            description: 'Avión de gran altitud para misiones de espionaje y reconocimiento.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'P3C',
            name: 'Lockheed P-3C Orion',
            role: 'military_recon',
            base_price: 9000,
            description: 'Patrulla marítima y guerra antisubmarina con capacidades de vigilancia.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },

        // ==========================
        // COMMERCIAL PASSENGER
        // ==========================
        {
            id: 'A320',
            name: 'Airbus A320-200',
            role: 'commercial_passenger',
            base_price: 5000,
            description: 'Reactor de pasillo único para rutas de corto y medio radio.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'B738',
            name: 'Boeing 737-800',
            role: 'commercial_passenger',
            base_price: 5200,
            description: 'Avión de pasillo único muy extendido en rutas domésticas y regionales.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'B773',
            name: 'Boeing 777-300ER',
            role: 'commercial_passenger',
            base_price: 9000,
            description: 'Bimotor de largo radio para rutas intercontinentales de alta capacidad.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },

        // ==========================
        // COMMERCIAL CARGO
        // ==========================
        {
            id: 'B738F',
            name: 'Boeing 737-800F',
            role: 'commercial_cargo',
            base_price: 6000,
            description: 'Versión de carga del 737-800 para rutas regionales de mercancías.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'B763F',
            name: 'Boeing 767-300F',
            role: 'commercial_cargo',
            base_price: 8000,
            description: 'Avión de carga de medio y largo alcance para grandes volúmenes.',
            is_active: 1,
            created_at: now,
            updated_at: now
        },
        {
            id: 'ATR72F',
            name: 'ATR 72 Freighter',
            role: 'commercial_cargo',
            base_price: 3500,
            description: 'Turbohélice de carga ideal para rutas cortas y aeropuertos pequeños.',
            is_active: 1,
            created_at: now,
            updated_at: now
        }
    ]);
};
