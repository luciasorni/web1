// /public/js/main.js

// Aplicar estado apenas cargue el script (evita parpadeos y asegura todas las vistas)
(() => {
    const DALTONIC_KEY = 'skyport_daltonic';
    const initial = localStorage.getItem(DALTONIC_KEY) === '1';
    if (initial) {
        // Si body aún no existe, cae en DOMContentLoaded
        if (document.body) document.body.classList.add('daltonic-mode');
        document.documentElement.classList.add('daltonic-mode');
    }

    document.addEventListener('DOMContentLoaded', () => {
        const $ = (id) => document.getElementById(id);

        const applyState = (on, button) => {
            document.body.classList.toggle('daltonic-mode', on);
            document.documentElement.classList.toggle('daltonic-mode', on);
            if (button) {
                button.textContent = on ? 'Modo daltonismo: ON' : 'Modo daltonismo: OFF';
            }
        };

        let daltonismToggle = $('daltonismToggle');

        // Si no hay botón en la vista, creamos uno flotante discreto
        if (!daltonismToggle) {
            daltonismToggle = document.createElement('button');
            daltonismToggle.id = 'daltonismToggle';
            daltonismToggle.className = 'daltonism-toggle-floating';
            daltonismToggle.type = 'button';
            daltonismToggle.textContent = initial ? 'Modo daltonismo: ON' : 'Modo daltonismo: OFF';
            document.body.appendChild(daltonismToggle);
        }

        applyState(initial, daltonismToggle);

        daltonismToggle.addEventListener('click', () => {
            const next = !document.body.classList.contains('daltonic-mode');
            localStorage.setItem(DALTONIC_KEY, next ? '1' : '0');
            applyState(next, daltonismToggle);
        });
    });
})();
