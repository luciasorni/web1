(() => {
  const form = document.getElementById('registerForm');
  const cb   = document.getElementById('acepto');
  const btn  = document.getElementById('submitBtn');
  const err  = document.querySelector('.form-error');

  function sync() { btn.disabled = !cb.checked; }
  cb.addEventListener('change', sync);
  sync();

  form.addEventListener('submit', (e) => {
    err.hidden = true;
    if (!form.checkValidity()) {
      e.preventDefault();
      err.textContent = 'Revisa los campos: completa todos, DNI válido y contraseña de 8+ caracteres.';
      err.hidden = false;
    }
  });
})();