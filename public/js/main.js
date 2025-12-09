// /public/js/main.js

// Sobrescribir alert() para q no salga localhost:4000 dice..., sino SkyPort dice...
window.alert = function (msg) {
    const box = document.createElement("div");

    box.textContent = "SkyPort dice: " + msg;

    Object.assign(box.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "14px 20px",
        background: "#1e6f9f",
        color: "white",
        fontSize: "15px",
        fontFamily: "Poppins, sans-serif",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,.18)",
        zIndex: 99999,
        opacity: 0,
        transition: "opacity 0.3s ease"
    });

    document.body.appendChild(box);

    // Fade in
    requestAnimationFrame(() => box.style.opacity = 1);

    // Remove after 3s
    setTimeout(() => {
        box.style.opacity = 0;
        setTimeout(() => box.remove(), 300);
    }, 2400);
};


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
            daltonismToggle.className = 'botonDaltonismo daltonism-toggle-floating';
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
