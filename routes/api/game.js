// routes/api/game.js

const express = require('express');
const router = express.Router();

const { findUsersByIds } = require('../../data/usersStore/db');

// Fleet
const {
    getFleetForUser,
    getAllAircraftTypes,
    buyAircraftForUser,
    sellAircraftForUser
} = require('../../data/fleetStore/db');

// Missions ✈️
const {
    getMissionsForUser,
    getAllMissions,
    activateMissionForUser,
    resolveDueMissionsForUser
} = require('../../data/missionsStore/db')

// Economy 💰
const {
    getEconomyForUser
} = require('../../data/economyStore/db');
const { getActiveEvents } = require('../../data/eventsStore/db');

const { optionalAuth, requireAuth } = require('../../middleware/auth');


// --- /api/game/economy ---
// Devuelve saldo actual + movimientos (ingresos/gastos) del usuario logueado
router.get('/economy', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        const { balance, movements } = await getEconomyForUser(userId);

        res.json({
            ok: true,
            userId,
            balance,
            movements
        });
    } catch (err) {
        console.error('GET /api/game/economy error', err);

        if (err.code === 'USER_NOT_FOUND') {
            return res.status(404).json({
                ok: false,
                error: 'user_not_found'
            });
        }

        return res.status(500).json({
            ok: false,
            error: 'internal_error'
        });
    }
});


// --- GET /api/game/fleet ---
// Devuelve flota del usuario + catálogo de tipos
router.get('/fleet', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Promise.all([]): Para hacer más rápida la ejecución de las promesas
        const [fleet, catalog] = await Promise.all([
            getFleetForUser(userId),
            getAllAircraftTypes()
        ]);

        res.json({
            ok: true,
            userId,
            fleet,
            catalog
        });
    } catch (err) {
        console.error('GET /api/game/fleet error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// --- POST /api/game/fleet/buy ---
// Body: { aircraftTypeId: string }
router.post('/fleet/buy', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const { aircraftTypeId } = req.body || {};

    if (!aircraftTypeId) {
        return res.status(400).json({
            ok: false,
            error: 'missing_aircraft_type_id'
        });
    }

    try {
        const result = await buyAircraftForUser({ userId, aircraftTypeId });

        return res.json({
            ok: true,
            aircraft: result.aircraft,
            credits: result.credits
        });

    } catch (err) {
        console.error('POST /api/game/fleet/buy error', err);

        if (err.code === 'TYPE_NOT_FOUND') {
            return res.status(404).json({ ok: false, error: 'type_not_found' });
        }
        if (err.code === 'USER_NOT_FOUND') {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }
        if (err.code === 'INSUFFICIENT_CREDITS') {
            return res.status(400).json({ ok: false, error: 'insufficient_credits' });
        }
        if (err.code === 'FLEET_LIMIT') {
            return res.status(400).json({ ok: false, error: 'fleet_limit' });
        }

        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// --- /api/game/market ---
// Devuelve catalogo (tipos activos) y flota del usuario (para vender)
router.get('/market', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const [fleet, catalog] = await Promise.all([
            getFleetForUser(userId),
            getAllAircraftTypes()
        ]);
        res.json({ ok: true, userId, fleet, catalog });
    } catch (err) {
        console.error('GET /api/game/market error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// --- /api/game/market/sell ---
// Body: { aircraftId }
router.post('/market/sell', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const { aircraftId } = req.body || {};

    if (!aircraftId) {
        return res.status(400).json({ ok: false, error: 'missing_aircraft_id' });
    }

    try {
        const result = await sellAircraftForUser({ userId, aircraftId });
        return res.json({ ok: true, ...result });
    } catch (err) {
        console.error('POST /market/sell error', err);
        if (err.code === 'AIRCRAFT_NOT_FOUND') {
            return res.status(404).json({ ok: false, error: 'aircraft_not_found' });
        }
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// --- /api/game/missions ---
router.get('/missions', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        const [userMissions, catalog] = await Promise.all([
            getMissionsForUser(userId),
            getAllMissions()
        ]);

        res.json({
            ok: true,
            userId,
            missions: userMissions,  // misiones del usuario
            catalog                  // catálogo completo
        });
    } catch (err) {
        console.error('GET /api/game/missions error', err);
        res.status(500).json({ error: 'internal_error' });
    }
});

// --- /api/game/missions/:id/activate ---
router.post('/missions/:id/activate', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const missionId = req.params.id;

    try {
        // Llamaremos a una función del store (aún no existe)
        const result = await activateMissionForUser({ userId, missionId });

        return res.json({
            ok: true,
            ...result
        });

    } catch (err) {
        console.error('POST /missions/:id/activate error', err);

        // Mapeamos errores conocidos a respuestas HTTP
        if (err.code === 'MISSION_NOT_FOUND') {
            return res.status(404).json({ ok: false, error: 'mission_not_found' });
        }

        if (err.code === 'NO_COMPATIBLE_AIRCRAFT') {
            return res.status(400).json({ ok: false, error: 'no_compatible_aircraft' });
        }

        if (err.code === 'INSUFFICIENT_CREDITS') {
            return res.status(400).json({ ok: false, error: 'insufficient_credits' });
        }

        // Cualquier error inesperado
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// --- POST /api/game/missions/:id/abort ---
router.post('/missions/:id/abort', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const userMissionId = req.params.id;

    try {
        const result = await abortMissionForUser({ userId, userMissionId });
        return res.json({ ok: true, ...result });
    } catch (err) {
        console.error('POST /missions/:id/abort error', err);
        if (err.code === 'MISSION_NOT_FOUND') {
            return res.status(404).json({ ok: false, error: 'mission_not_found' });
        }
        if (err.code === 'MISSION_NOT_RUNNING') {
            return res.status(400).json({ ok: false, error: 'mission_not_running' });
        }
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// --- POST /api/game/missions/resolve-due ---
// Resuelve las misiones del usuario que ya han alcanzado su hora de fin
router.post('/missions/resolve-due', requireAuth, async (req, res) => {
    const userId = req.session.userId;

    try {
        const result = await resolveDueMissionsForUser({ userId });

        return res.json({
            ok: true,
            ...result
        });

    } catch (err) {
        console.error('POST /api/game/missions/resolve-due error', err);

        if (err.code === 'NO_DUE_MISSIONS') {
            return res.json({
                ok: true,
                resolved: [],
                message: 'no_due_missions'
            });
        }

        return res.status(500).json({
            ok: false,
            error: 'internal_error'
        });
    }
});

// --- GET /api/game/events ---
// Devuelve eventos activos para los jugadores (ventana de fechas + status active)
router.get('/events', requireAuth, async (req, res) => {
    try {
        const events = await getActiveEvents();
        res.json({ ok: true, events });
    } catch (err) {
        console.error('GET /api/game/events error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

module.exports = router;
