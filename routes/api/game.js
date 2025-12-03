// routes/api/game.js

const express = require('express');
const router = express.Router();

const { findUsersByIds } = require('../../data/usersStore/db');

// Fleet
const {
    getFleetForUser,
    getAllAircraftTypes,
    buyAircraftForUser
} = require('../../data/fleetStore/db');

// Economy 💰
const {
    getEconomyForUser
} = require('../../data/economyStore/db');

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

        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

module.exports = router;
