// /public/js/login.js
// Envia el login a /api/auth/login y gestiona respuestas.

document.addEventListener('DOMContentLoaded', () => {
    const form   = document.getElementById('loginForm');
    const userEl = document.getElementById('username');
    const passEl = document.getElementById('password');
    if (!form || !userEl || !passEl) return;

    async function handleSubmit() {
        // Validación nativa HTML5
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const user = userEl.value.trim();
        const pass = passEl.value;

        try {
            const r = await fetch('/api/auth/login', {  // El servidor web atiende a esa ruta
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ user, pass })
            });

            if (r.ok) {
                // Login correcto → me lleva a la zona privada que he establecido (criterio mio)
                // La cookie de sesión viaja automáticamente en la nueva petición.
                return window.location.assign('/game');
            }

            // Placeholders mientras no implemente el backend real:
            if (r.status === 501) {
                // De momento el backend aún no implementa /login
                return alert('Login aún no implementado en servidor (501). Seguimos con el paso 5 para activarlo.');
            }

            if (r.status === 401) {
                const data = await r.json().catch(() => ({}));
                alert('Credenciales incorrectas' + (data.error ? ` (${data.error})` : ''));
                return;
            }

            if (r.status === 429) {
                return alert('Demasiados intentos. Espera un momento.');
            }

            // Resto de errores
            const err = await r.text().catch(() => '');
            console.warn('Error login:', r.status, err);
            alert('Error en el login. Inténtalo de nuevo.');
        } catch (e) {
            console.error(e);
            alert('No se pudo contactar con el servidor.');
        }
    }

    // Lanzar el handler cuando pulsamos el botón "entrar" o cuando damos "enter"
    form.addEventListener('submit', (e) => {
        e.preventDefault();     // evita recarga
        handleSubmit();         // tú controlas el envío
    });
});
