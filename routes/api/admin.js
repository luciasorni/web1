const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
const {
    listUsers,
    createUser,
    updateUser,
    findUserByUsername,
    findUserByEmail,
    findUserById,
    deleteUserById
} = require('../../data/usersStore/db');
const {
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent
} = require('../../data/eventsStore/db');

// Aplica protección admin a todas las rutas de este subrouter
router.use(requireRole('admin'));

// GET /api/admin/users -> listado
router.get('/users', async (req, res) => {
    try {
        const users = await listUsers();
        res.json({
            ok: true,
            users
        });
    } catch (err) {
        console.error('GET /api/admin/users error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// POST /api/admin/users -> crear usuario
router.post('/users', async (req, res) => {
    try {
        const { username, email, password, roles } = req.body || {};
        if (!username || !email || !password) {
            return res.status(400).json({ ok: false, error: 'missing_fields' });
        }
        if (await findUserByUsername(username)) return res.status(409).json({ ok: false, error: 'username_taken' });
        if (await findUserByEmail(email))       return res.status(409).json({ ok: false, error: 'email_taken' });

        // No permitimos crear admins vía panel
        const safeRoles = Array.isArray(roles) ? roles.filter(r => r !== 'admin') : undefined;

        const newUser = await createUser({ username, email, password, roles: safeRoles });
        res.status(201).json({ ok: true, user: newUser });
    } catch (err) {
        console.error('POST /api/admin/users error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// PATCH /api/admin/users/:id -> actualizar roles / activar-desactivar
router.patch('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, isActive } = req.body || {};

        const target = await findUserById(id);
        if (!target) return res.status(404).json({ ok: false, error: 'not_found' });

        // Si es admin, no permitimos suspender ni cambiar roles
        if (target.roles?.includes('admin')) {
            return res.status(403).json({ ok: false, error: 'cannot_modify_admin' });
        }

        // Sanitiza roles para evitar elevar a admin desde panel
        const parsedRoles = Array.isArray(roles) ? roles.filter(r => r !== 'admin') : undefined;
        const parsedActive = (typeof isActive === 'boolean') ? isActive : undefined;

        const updated = await updateUser({ id, roles: parsedRoles, isActive: parsedActive });
        if (!updated) return res.status(404).json({ ok: false, error: 'not_found' });

        res.json({ ok: true, user: updated });
    } catch (err) {
        console.error('PATCH /api/admin/users/:id error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// DELETE /api/admin/users/:id -> borrar usuario (no admins)
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const target = await findUserById(id);
        if (!target) return res.status(404).json({ ok: false, error: 'not_found' });
        if (target.roles?.includes('admin')) return res.status(403).json({ ok: false, error: 'cannot_delete_admin' });

        const ok = await deleteUserById(id);
        if (!ok) return res.status(404).json({ ok: false, error: 'not_found' });
        res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/admin/users/:id error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

// --- EVENTS ---
router.get('/events', async (req, res) => {
    try {
        const events = await listEvents();
        res.json({ ok: true, events });
    } catch (err) {
        console.error('GET /api/admin/events error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

router.post('/events', async (req, res) => {
    try {
        const { name, description, boostPercent = 0, startAt, endAt, status = 'active' } = req.body || {};

        if (!name || !startAt || !endAt) {
            return res.status(400).json({ ok: false, error: 'missing_fields' });
        }

        const ev = await createEvent({ name, description, boostPercent: Number(boostPercent) || 0, startAt, endAt, status });
        res.status(201).json({ ok: true, event: ev });
    } catch (err) {
        console.error('POST /api/admin/events error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

router.patch('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, boostPercent, startAt, endAt, status } = req.body || {};
        const updated = await updateEvent(id, { name, description, boostPercent: boostPercent !== undefined ? Number(boostPercent) : undefined, startAt, endAt, status });
        if (!updated) return res.status(404).json({ ok: false, error: 'not_found' });
        res.json({ ok: true, event: updated });
    } catch (err) {
        console.error('PATCH /api/admin/events/:id error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

router.delete('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const ok = await deleteEvent(id);
        if (!ok) return res.status(404).json({ ok: false, error: 'not_found' });
        res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/admin/events/:id error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

module.exports = router;
