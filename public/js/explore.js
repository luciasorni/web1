// /public/js/explore.js
// Modo invitado: buscar usuarios y ver su aeropuerto/flota.

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('guestSearchInput');
    const searchBtn   = document.getElementById('guestSearchBtn');
    const clearBtn    = document.getElementById('guestClearBtn');
    const resultsBox  = document.getElementById('guestResults');

    const userTitle   = document.getElementById('guestUserTitle');
    const userMeta    = document.getElementById('guestUserMeta');
    const airportName = document.getElementById('guestAirportName');
    const airportLevel= document.getElementById('guestAirportLevel');
    const airportXp   = document.getElementById('guestAirportXp');
    const profileBox  = document.getElementById('guestProfile');
    const errorBox    = document.getElementById('guestError');
    const fleetBox    = document.getElementById('guestFleet');

    // ---------- Página de búsqueda ----------
    if (resultsBox && searchInput) {
        const fetchUsers = async (q = '') => {
            try {
                const res = await fetch(`/api/explore/search?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                if (!res.ok || !data.ok) throw new Error(data.error || 'Error');
                renderResults(data.users || []);
            } catch (err) {
                console.error(err);
                resultsBox.innerHTML = '<p class="explore-error">No se pudo cargar la búsqueda.</p>';
            }
        };

        const renderResults = (users) => {
            if (!users.length) {
                resultsBox.innerHTML = '<p class="explore-error">Sin resultados.</p>';
                return;
            }
            resultsBox.innerHTML = users.map(u => `
                <article class="explore-card">
                    <h3>${u.username}</h3>
                    <p class="small">${u.email || ''}</p>
                    <p>Roles: ${(u.roles || []).join(', ') || 'sin roles'}</p>
                    <p>Estado: ${u.isActive ? 'activo' : 'suspendido'}</p>
                    ${u.airport ? `
                        <p>Aeropuerto: ${u.airport.name} · Nivel ${u.airport.level}</p>
                    ` : '<p>Aeropuerto: -</p>'}
                    <a class="admin-btn admin-btn--primary" href="/explore/username?u=${encodeURIComponent(u.username)}">Visitar</a>
                </article>
            `).join('');
        };

        searchBtn?.addEventListener('click', () => fetchUsers(searchInput.value));
        clearBtn?.addEventListener('click', () => {
            searchInput.value = '';
            fetchUsers('');
        });
        searchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                fetchUsers(searchInput.value);
            }
        });

        fetchUsers('');
    }

    // ---------- Página de detalle ----------
    if (userTitle) {
        const params = new URLSearchParams(window.location.search);
        const username = params.get('u');
        if (!username) {
            showError('Falta el usuario a consultar.');
            return;
        }

        loadUser(username);
    }

    async function loadUser(username) {
        try {
            const res = await fetch(`/api/explore/user/${encodeURIComponent(username)}`);
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Error');

            renderUser(data.user, data.fleet || []);
        } catch (err) {
            console.error(err);
            showError('Usuario no encontrado.');
        }
    }

    function renderUser(user, fleet) {
        if (!user) return showError('Usuario no encontrado.');
        if (errorBox) errorBox.hidden = true;
        userTitle.textContent = `@${user.username}`;
        userMeta.textContent = user.email || '';
        if (user.airport) {
            airportName.textContent = `Nombre: ${user.airport.name}`;
            airportLevel.textContent = `Nivel: ${user.airport.level}`;
            airportXp.textContent = `XP: ${user.airport.xp}`;
        } else {
            airportName.textContent = 'Aeropuerto no disponible';
            airportLevel.textContent = '';
            airportXp.textContent = '';
        }
        if (profileBox) profileBox.hidden = false;

        renderFleet(fleet);
    }

    function renderFleet(fleet) {
        if (!fleetBox) return;
        if (!fleet.length) {
            fleetBox.innerHTML = '<p class="missions-page__empty">No se encontraron aeronaves.</p>';
            return;
        }
        fleetBox.innerHTML = fleet.map(f => `
            <div class="missions-page__card">
                <span class="missions-page__card-title">${f.nickname || f.aircraftTypeId}</span>
                <p class="missions-page__card-desc">Tipo: ${f.aircraftTypeId}</p>
                <p class="missions-page__card-desc">Estado: ${f.status}</p>
            </div>
        `).join('');
    }

    function showError(msg) {
        if (errorBox) {
            errorBox.textContent = msg;
            errorBox.hidden = false;
        }
        if (profileBox) profileBox.hidden = true;
    }
});
