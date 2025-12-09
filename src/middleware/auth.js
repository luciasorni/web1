// middleware/auth.js

// No bloquea. Si hay sesión, rellena req.user
// Lo necesitan los endpoints públicos que si estás logueado, quieren saber quién eres.
function optionalAuth(req, res, next) {
    if (req.session?.userId) { // Accede a userId solo si req.session existe. Si no existe, devuelve undefined.”
        req.user = { id: req.session.userId, roles: req.session.roles || [] };
    }
    next();
}

// Bloquea si no hay sesión → 401 { error: 'unauthorized' }.
// Lo necesitan los Endpoints privados que requieren usuario autenticado.
function requireAuth(req, res, next) {
    if (!req.session?.userId) return res.status(401).json({ error: 'unauthorized' });
    req.user = { id: req.session.userId, roles: req.session.roles || [] };
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session?.userId) return res.status(401).json({ error: 'unauthorized' });
        const userRoles = req.session.roles || [];
        const ok = roles.some(r => userRoles.includes(r));
        if (!ok) return res.status(403).json({ error: 'forbidden' });
        next();
    };
}

// --- Vistas HTML: redirigir a /login si no hay sesión/rol ---
function requireAuthPage(req, res, next) {
    if (!req.session?.userId) {
        const nextUrl = encodeURIComponent(req.originalUrl || '/');
        return res.redirect(`/login?next=${nextUrl}`);
    }
    next();
}

function requireRolePage(...roles) {
    return (req, res, next) => {
        if (!req.session?.userId) {
            const nextUrl = encodeURIComponent(req.originalUrl || '/');
            return res.redirect(`/login?next=${nextUrl}`);
        }
        const userRoles = req.session.roles || [];
        const ok = roles.some(r => userRoles.includes(r));
        if (!ok) return res.status(403).type('html').send('<h1>403 – Forbidden</h1>');
        next();
    };
}

module.exports = {
    optionalAuth,
    requireAuth,
    requireRole,
    requireAuthPage,
    requireRolePage
};

