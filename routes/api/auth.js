const express = require('express');
const path = require('path');
const router = express.Router();

// Utilidad simple para pausar ejecuciones (evita ataques de timing en producción)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Import middleware relativo a gestión de usuarios (/data) y autenticación (/middleware)
const bcrypt = require('bcryptjs');
const { findUserByUsername, findUserByEmail, createUser, updateUserPassword } = require('../../data/usersStore/db');

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

// --- /api/auth/login ---
router.post('/login', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') await sleep(120);
        const { user, pass } = req.body || {};
        const key = (user || '').trim();
        if (!key || typeof pass !== 'string') {
            return res.status(400).json({ error: 'bad_request' });
        }

        console.log('[LOGIN] attempt for', key.includes('@') ? 'email' : 'username', key);

        const candidate = key.includes('@')
            ? await findUserByEmail(key.toLowerCase())
            : await findUserByUsername(key);

        if (!candidate) return res.status(401).json({ error: 'credenciales' });
        if (!candidate.isActive) return res.status(403).json({ error: 'user_suspended' });

        const ok = await bcrypt.compare(pass, candidate.passwordHash);
        if (!ok) return res.status(401).json({ error: 'credenciales' });

        await new Promise(resolve => req.session.regenerate(resolve));  // Genera nuevo SID (sesion vacía)
        req.session.userId = candidate.id;      // la sesión queda marcada como modificada.
        req.session.userName = candidate.username;  // la sesión queda marcada como modificada.
        req.session.roles  = candidate.roles || []; // la sesión queda marcada como modificada.
        req.session.iat    = Date.now();    // la sesión queda marcada como modificada.

        // Guarda en Redis y Express envía Set-Cookie con el nuevo SID y las opciones (httpOnly, sameSite, secure, maxAge).
        req.session.save(err => {
            if (err) return res.status(500).json({ error: 'session_save' });
            res.json({ ok: true, userId: candidate.id, roles: candidate.roles || [] });
        });
    } catch (e) {
        console.error('LOGIN ERROR', e);
        res.status(500).json({ error: 'login_failed' });
    }
});

// --- /api/auth/recover ---
router.post('/recover', async (req, res) => {
    try {
        const { user, password } = req.body || {};
        const key = (user || '').trim();
        const pass = password || '';

        if (!key || !pass) {
            return res.status(400).json({ error: 'bad_request' });
        }
        if (!isValidPass(pass)) return res.status(400).json({ error: 'bad_password' });

        const lookupByEmail = key.includes('@');

        if (lookupByEmail && !isValidEmail(key)) {
            return res.status(400).json({ error: 'bad_email' });
        }
        if (!lookupByEmail && !isValidUsername(key)) {
            return res.status(400).json({ error: 'bad_username' });
        }

        const candidate = lookupByEmail
            ? await findUserByEmail(key.toLowerCase())
            : await findUserByUsername(key);

        if (!candidate) {
            if (process.env.NODE_ENV === 'production') await sleep(150);
            return res.status(404).json({ error: 'user_not_found' });
        }

        if (!candidate.isActive) {
            return res.status(403).json({ error: 'user_suspended' });
        }

        await updateUserPassword({ id: candidate.id, password: pass });

        res.json({ ok: true });
    } catch (e) {
        console.error('RECOVER ERROR', e);
        res.status(500).json({ error: 'recover_failed' });
    }
});


module.exports = router;
