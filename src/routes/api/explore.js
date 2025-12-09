const express = require('express');
const router = express.Router();
const { searchUsers, findUserWithAirportByUsername } = require('../../data/usersStore/db');
const { getFleetForUser } = require('../../data/fleetStore/db');

// Búsqueda abierta (invita/o sin login)
router.get('/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        const users = await searchUsers({ query: q, limit: 30 });
        const filtered = users.filter(u => !(u.roles || []).includes('admin'));
        res.json({ ok: true, users: filtered });
    } catch (err) {
        console.error('GET /api/explore/search error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// Detalle de usuario invitado (aeropuerto + flota)
router.get('/user/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const user = await findUserWithAirportByUsername(username);
        if (!user) return res.status(404).json({ ok: false, error: 'not_found' });

        const fleet = await getFleetForUser(user.id);

        res.json({
            ok: true,
            user,
            fleet
        });
    } catch (err) {
        console.error('GET /api/explore/user/:username error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

module.exports = router;
