const express = require('express');
const path = require('path');
const router = express.Router();

// Import middleware relativo a gestión de usuarios (/data) y autenticación (/middleware)
const bcrypt = require('bcryptjs');
const { findUserByUsername, findUserByEmail, createUser } = require('../../data/usersStore/db');

// Middleware simple de validación
function isValidUsername(s){ return typeof s==='string' && /^[a-zA-Z0-9_]{3,20}$/.test(s); }
function isValidEmail(s){ return typeof s==='string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s); }
function isValidPass(s){ return typeof s==='string' && s.length >= 8; }

// /admin/users
router.get('/users', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/users.html'));
});

// /admin/events
router.get('/events', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/events.html'));
});

// --- /api/auth/register ---
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, autoLogin } = req.body || {};

        const u = (username || '').trim();
        const e = (email || '').trim().toLowerCase();
        const p = password || '';

        if (!isValidUsername(u)) return res.status(400).json({ error: 'bad_username' });
        if (!isValidEmail(e))    return res.status(400).json({ error: 'bad_email' });
        if (!isValidPass(p))     return res.status(400).json({ error: 'bad_password' });

        if (await findUserByUsername(u)) return res.status(409).json({ error: 'username_taken' });
        if (await findUserByEmail(e))    return res.status(409).json({ error: 'email_taken' });

        const newUser = await createUser({ username: u, email: e, password: p });

        if (autoLogin !== false) {
            await new Promise(resolve => req.session.regenerate(resolve));
            req.session.userId = newUser.id;
            req.session.userName = newUser.username;
            req.session.roles  = newUser.roles || [];
            req.session.iat    = Date.now();
            return req.session.save(err => {
                if (err) return res.status(500).json({ error: 'session_save' });
                res.status(201).json({ ok: true, userId: newUser.id, roles: newUser.roles });
            });
        }

        res.status(201).json({ ok: true, userId: newUser.id });
    } catch (e) {
        console.error('REGISTER ERROR', e);
        res.status(500).json({ error: 'register_failed' });
    }
});

module.exports = router;
