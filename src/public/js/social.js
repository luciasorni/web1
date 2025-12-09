// /public/js/social.js
// Página Social: búsquedas, solicitudes y amigos con actualizaciones en tiempo real.

document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);

    const searchInput = $('search-user');
    const searchBtn   = $('btn-search');
    const resultsBox  = $('search-results');
    const requestsBox = $('requests-list');
    const friendsBox  = $('friends-list');
    const statFriends = $('stat-friends');
    const statOnline  = $('stat-online');
    const statReqs    = $('stat-requests');
    const inviteBtn   = $('btn-invite-code');
    const copyLinkBtn = $('btn-copy-link');

    const state = {
        userId: null,
        userName: '',
        friends: [],
        requests: [],
    };

    let socket;

    const updateStats = (stats = {}) => {
        if (statFriends) statFriends.textContent = stats.friends ?? '0';
        if (statOnline)  statOnline.textContent  = stats.online ?? '0';
        if (statReqs)    statReqs.textContent    = stats.requests ?? '0';
    };

    const renderFriends = (friends = []) => {
        if (!friendsBox) return;
        if (!friends.length) {
            friendsBox.innerHTML = '<div class="empty-box">Todavía no tienes amigos. Busca jugadores y envíales una solicitud.</div>';
            return;
        }
        friendsBox.innerHTML = friends.map(f => `
            <article class="friend-card">
                <div class="friend-top">
                    <div class="friend-name">
                        <span class="dot ${f.isOnline ? 'dot--on' : 'dot--off'}"></span>
                        <span>@${f.username}</span>
                    </div>
                    <span class="badge">${f.isOnline ? 'En línea' : 'Desconectado'}</span>
                </div>
                <div class="friend-meta">${f.email || ''}</div>
                <div class="friend-actions">
                    <button class="small-btn" disabled>Chat (coming soon)</button>
                </div>
            </article>
        `).join('');
    };

    const renderRequests = (requests = []) => {
        if (!requestsBox) return;
        if (!requests.length) {
            requestsBox.classList.add('empty-box');
            requestsBox.textContent = 'No tienes solicitudes pendientes.';
            return;
        }
        requestsBox.classList.remove('empty-box');
        requestsBox.innerHTML = requests.map(r => `
            <div class="request-row" data-request-id="${r.id}">
                <div>
                    <div class="result-name">@${r.fromUser.username}</div>
                    <div class="friend-meta">Quiere ser tu amigo</div>
                </div>
                <div class="req-actions">
                    <button class="btn btn--primary js-accept" data-request-id="${r.id}">Aceptar</button>
                    <button class="btn js-decline" data-request-id="${r.id}">Rechazar</button>
                </div>
            </div>
        `).join('');
    };

    const renderResults = (results = []) => {
        if (!resultsBox) return;
        resultsBox.hidden = false;
        if (!results.length) {
            resultsBox.innerHTML = '<p class="empty-box">Sin resultados.</p>';
            return;
        }
        resultsBox.innerHTML = results.map(r => `
            <div class="result-row" data-user-id="${r.id}">
                <div>
                    <div class="result-name">@${r.username}</div>
                    <div class="friend-meta">${r.airport ? `Aeropuerto: ${r.airport.name} · Nivel ${r.airport.level}` : 'Sin aeropuerto'}</div>
                </div>
                <div class="result-actions">
                    ${
                        r.relation === 'friend'
                            ? '<span class="chip chip--ok">Amigos</span>'
                            : r.relation === 'incoming'
                                ? '<span class="chip chip--amber">Solicitud recibida</span>'
                                : r.relation === 'pending'
                                    ? '<span class="chip chip--amber">Solicitud enviada</span>'
                                    : `<button class="btn btn--primary js-send-request" data-user-id="${r.id}">Enviar solicitud</button>`
                    }
                </div>
            </div>
        `).join('');
    };

    const fetchState = async () => {
        try {
            const res = await fetch('/api/game/social/state', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Error');
            state.userId = data.userId;
            state.userName = data.userName || '';
            state.friends = data.friends || [];
            state.requests = data.requests || [];
            updateStats(data.stats);
            renderFriends(state.friends);
            renderRequests(state.requests);
        } catch (err) {
            console.error('No se pudo cargar social', err);
            if (resultsBox) {
                resultsBox.hidden = false;
                resultsBox.innerHTML = '<p class="empty-box">No se pudo cargar datos sociales.</p>';
            }
        }
    };

    const searchUsers = async () => {
        const q = searchInput?.value || '';
        try {
            const res = await fetch(`/api/game/social/search?q=${encodeURIComponent(q)}`, { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Error');
            renderResults(data.results || []);
        } catch (err) {
            console.error('Búsqueda social error', err);
            if (resultsBox) {
                resultsBox.hidden = false;
                resultsBox.innerHTML = '<p class="empty-box">No se pudo buscar jugadores.</p>';
            }
        }
    };

    const sendRequest = async (userId) => {
        try {
            const res = await fetch('/api/game/social/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Error');
            await Promise.all([fetchState(), searchUsers()]);
        } catch (err) {
            console.error('Error enviando solicitud', err);
            alert('No se pudo enviar la solicitud de amistad.');
        }
    };

    const respondRequest = async (requestId, action) => {
        try {
            const res = await fetch(`/api/game/social/requests/${encodeURIComponent(requestId)}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Error');
            await fetchState();
        } catch (err) {
            console.error('Error respondiendo solicitud', err);
            alert('No se pudo actualizar la solicitud.');
        }
    };

    const initSocket = () => {
        if (typeof io !== 'function') return;
        try {
            socket = io({ transports: ['websocket', 'polling'] });
            socket.on('social:request', () => fetchState());
            socket.on('social:accepted', () => fetchState());
        } catch (err) {
            console.warn('Socket social no disponible', err);
        }
    };

    // --- Eventos UI ---
    searchBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        searchUsers();
    });

    searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchUsers();
        }
    });

    resultsBox?.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.classList.contains('js-send-request')) {
            const uid = target.dataset.userId;
            if (uid) sendRequest(uid);
        }
    });

    requestsBox?.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const reqId = target.dataset.requestId;
        if (!reqId) return;
        if (target.classList.contains('js-accept')) {
            respondRequest(reqId, 'accept');
        } else if (target.classList.contains('js-decline')) {
            respondRequest(reqId, 'decline');
        }
    });

    if (typeof handleInviteCode === 'function' && inviteBtn) {
        inviteBtn.addEventListener('click', handleInviteCode);
    }
    if (typeof handleCopyLink === 'function' && copyLinkBtn) {
        copyLinkBtn.addEventListener('click', handleCopyLink);
    }

    // Inicialización
    fetchState();
    searchUsers();
    initSocket();
});
