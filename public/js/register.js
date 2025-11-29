// /public/js/register.js
// Valida y registra usuario contra /api/auth/register.
// Envía email + username + password y usa credentials:'include' para autologin.

document.addEventListener('DOMContentLoaded', () => {
    const form    = document.getElementById('registerForm');
    const userIpt = document.getElementById('username');
    const emailIpt= document.getElementById('email');
    const passIpt = document.getElementById('password');

    // Opcionales (hoy backend los ignora; los dejamos para futuro)
    const nameIpt = document.getElementById('nombre');
    const dniIpt  = document.getElementById('dni');

    const termCbx = document.getElementById('acepto');
    const btn     = document.getElementById('btnEntrar');
    const errBox  = document.querySelector('.form-error');

    if (!form || !btn || !userIpt || !emailIpt || !passIpt) return;

    const showError  = (msg) => { errBox.hidden = false; errBox.textContent = msg; };
    const clearError = ()    => { errBox.hidden = true;  errBox.textContent = ''; };

    const isValidDNI = v => !v || /^[0-9]{8}[A-Za-z]$/.test(v.trim()); // opcional

    const validate = () => {
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            form.reportValidity();
            return false;
        }
        if (!termCbx.checked) { showError('Debes aceptar términos y privacidad.'); termCbx.focus(); return false; }
        if (!isValidDNI(dniIpt?.value || '')) { showError('DNI inválido (ej. 12345678Z).'); dniIpt.focus(); return false; }
        clearError();
        return true;
    };

    const payload = () => ({
        username: userIpt.value.trim(),
        email:    emailIpt.value.trim(),
        password: passIpt.value,
        autoLogin: false,                     // Le indicamos al backend que realize autologin
        // Otros campos de formulario de registro
        nombre: (nameIpt?.value || '').trim(),
        dni:    (dniIpt?.value  || '').trim()
    });

    const toggleBusy = (b) => {
        btn.disabled = b;
        btn.textContent = b ? 'Creando…' : 'Crear cuenta';
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate()) return;

        toggleBusy(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',              // <- necesario para recibir cookie de sesión
                body: JSON.stringify(payload())
            });

            // Se interpreta la respuesta recibida del servidor

            if (res.status === 201) {
                // De momento se hace autologin y ya hay sesión → a la zona privada
                return window.location.assign('/game');
            }

            // Error de usuario ya registrado (bien nombre o bien email)
            if (res.status === 409) {
                const data = await res.json().catch(()=> ({}));
                if (data.error === 'username_taken') return showError('Ese usuario ya existe.');
                if (data.error === 'email_taken')    return showError('Ese email ya está registrado.');
                return showError('Usuario o email ya existen.');
            }

            // Error por datos invalidos al registrarse
            if (res.status === 400) {
                const data = await res.json().catch(()=> ({}));
                if (data.error === 'bad_username') return showError('Usuario inválido (3-20, solo letras/números/_).');
                if (data.error === 'bad_email')    return showError('Email inválido.');
                if (data.error === 'bad_password') return showError('Contraseña inválida (mín. 8).');
                return showError('Datos inválidos.');
            }
            // Cualquier otro tipo de error no controlado
            const txt = await res.text().catch(()=> '');
            showError(`No se pudo crear la cuenta (HTTP ${res.status}) ${txt && '– ' + txt}`);
        } catch (err) {
            console.error(err);
            showError('No se pudo contactar con el servidor.');
        } finally {
            toggleBusy(false);
        }
    });
});
