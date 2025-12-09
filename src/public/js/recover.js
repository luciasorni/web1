// /public/js/recover.js
// Gestiona el envío del formulario de recuperación de contraseña.

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('recoverForm');
    const userEl = document.getElementById('user');
    const passEl = document.getElementById('password');
    const confirmEl = document.getElementById('confirm');
    const errorBox = document.querySelector('.form-error');
    const okBox = document.querySelector('.form-ok');
    const submitBtn = document.getElementById('submitBtn');

    if (!form || !userEl || !passEl || !confirmEl || !submitBtn) return;

    const showError = (msg) => {
        if (!errorBox) return alert(msg);
        errorBox.textContent = msg;
        errorBox.hidden = false;
        if (okBox) okBox.hidden = true;
    };

    const showOk = (msg) => {
        if (okBox) {
            okBox.textContent = msg;
            okBox.hidden = false;
        }
        if (errorBox) errorBox.hidden = true;
    };

    const clearAlerts = () => {
        if (errorBox) errorBox.hidden = true;
        if (okBox) okBox.hidden = true;
    };

    async function handleSubmit() {
        clearAlerts();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (passEl.value !== confirmEl.value) {
            return showError('Las contraseñas no coinciden.');
        }

        const payload = {
            user: userEl.value.trim(),
            password: passEl.value
        };

        submitBtn.disabled = true;
        const originalLabel = submitBtn.textContent;
        submitBtn.textContent = 'Actualizando...';

        try {
            const r = await fetch('/api/auth/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (r.ok) {
                showOk('Contraseña actualizada. Ya puedes iniciar sesión.');
                form.reset();
                return;
            }

            let data = {};
            try { data = await r.json(); } catch (_) {}

            if (r.status === 404) {
                return showError('No encontramos ninguna cuenta con esos datos.');
            }
            if (r.status === 403 && data.error === 'user_suspended') {
                return showError('Tu cuenta está suspendida. Contacta con un administrador.');
            }
            if (r.status === 400 && data.error === 'bad_password') {
                return showError('La contraseña debe tener al menos 8 caracteres.');
            }
            if (r.status === 400) {
                return showError('Revisa los datos introducidos.');
            }

            console.warn('Recover error', r.status, data);
            showError('No se pudo actualizar la contraseña. Inténtalo más tarde.');
        } catch (e) {
            console.error('Recover request failed', e);
            showError('No se pudo contactar con el servidor.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
        }
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmit();
    });
});
