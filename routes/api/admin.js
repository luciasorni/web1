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
    listAllMissionsAdmin,
    createMission,
    updateMission,
    deleteMission
} = require('../../data/missionsStore/db');

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

// --- MISSIONS ADMIN (sustituye a eventos) ---
router.get('/missions', async (req, res) => {
    try {
        const missions = await listAllMissionsAdmin();
        res.json({ ok: true, missions });
    } catch (err) {
        console.error('GET /api/admin/missions error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

router.post('/missions', async (req, res) => {
    try {
        const { name, description, type, cost, reward, durationSeconds, levelRequired = 1, isActive = true } = req.body || {};

        if (!name || !type || cost === undefined || reward === undefined || durationSeconds === undefined) {
            return res.status(400).json({ ok: false, error: 'missing_fields' });
        }

        const mission = await createMission({
            name,
            description,
            type,
            cost: Number(cost),
            reward: Number(reward),
            durationSeconds: Number(durationSeconds),
            levelRequired: Number(levelRequired) || 1,
            isActive: Boolean(isActive)
        });
        res.status(201).json({ ok: true, mission });
    } catch (err) {
        console.error('POST /api/admin/missions error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

router.patch('/missions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, type, cost, reward, durationSeconds, levelRequired, isActive } = req.body || {};
        const updated = await updateMission(id, {
            name,
            description,
            type,
            cost: cost !== undefined ? Number(cost) : undefined,
            reward: reward !== undefined ? Number(reward) : undefined,
            durationSeconds: durationSeconds !== undefined ? Number(durationSeconds) : undefined,
            levelRequired: levelRequired !== undefined ? Number(levelRequired) : undefined,
            isActive: isActive !== undefined ? Boolean(isActive) : undefined
        });
        if (!updated) return res.status(404).json({ ok: false, error: 'not_found' });
        res.json({ ok: true, mission: updated });
    } catch (err) {
        console.error('PATCH /api/admin/missions/:id error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

router.delete('/missions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const ok = await deleteMission(id);
        if (!ok) return res.status(404).json({ ok: false, error: 'not_found' });
        res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/admin/missions/:id error', err);
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

module.exports = router;
