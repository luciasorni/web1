(() => {
  const form   = document.getElementById('recoverForm');
  const dni    = document.getElementById('dni');
  const pass   = document.getElementById('password');
  const conf   = document.getElementById('confirm');
  const btn    = document.getElementById('submitBtn');
  const err    = document.querySelector('.form-error');
  const ok     = document.querySelector('.form-ok');

  const DNI_RE = /^[0-9]{8}[A-Za-z]$/;

  function showError(msg) {
    ok.hidden = true;
    err.textContent = msg;
    err.hidden = false;
  }
  function hideError() { err.hidden = true; }

  // Validación en tiempo real (opcional)
  function validate() {
    hideError();
    if (!DNI_RE.test(dni.value.trim())) {
      showError('DNI inválido. Debe ser 8 dígitos y una letra (ej: 12345678Z).');
      return false;
    }
    if (pass.value.length < 8) {
      showError('La contraseña debe tener al menos 8 caracteres.');
      return false;
    }
    if (pass.value !== conf.value) {
      showError('Las contraseñas no coinciden.');
      return false;
    }
    return true;
  }

  [dni, pass, conf].forEach(el => el.addEventListener('input', validate));

  form.addEventListener('submit', (e) => {
    if (!validate()) {
      e.preventDefault();
      return;
    }
    // Si quieres feedback inmediato de cliente:
    ok.textContent = 'Procesando la recuperación…';
    ok.hidden = false;
  });
})();
