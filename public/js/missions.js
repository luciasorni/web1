// /public/js/missions.js
// Columna central: catálogo de misiones (tabla missions)
// Columna derecha: misiones del usuario (user_missions)

let catalogContainer;
let activeContainer;
let searchInput;
let searchBtn;

let catalog = [];
let missions = [];

// Intervalo global para actualizar los temporizadores
let missionTimerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    initMissionsPage().catch(err => {
        console.error('Error inicializando pantalla de misiones', err);
    });
});

async function initMissionsPage() {
    catalogContainer = document.getElementById('missionsCatalog');
    activeContainer  = document.getElementById('missionsActive');
    searchInput      = document.getElementById('missionSearch');
    searchBtn        = document.getElementById('missionSearchBtn');

    if (!catalogContainer || !activeContainer) {
        console.warn('No se han encontrado los contenedores de misiones en el DOM');
        return;
    }

    // 1) Resolver misiones vencidas (si las hay)
    try {
        await resolveDueMissions();
    } catch (err) {
        console.warn('Error resolviendo misiones vencidas (se continúa igualmente)', err);
    }

    // 2) Cargar datos de catálogo + misiones del usuario
    await loadMissionsData();

    // 3) Listeners de búsqueda
    setupSearchHandlers();

    // 4) Listeners de botones (info/activate en catálogo, etc.)
    setupCatalogListeners();
    setupActiveListeners();
}

/* ===========================
 *  Llamadas a la API
 * =========================== */

async function resolveDueMissions() {
    const res = await fetch('/api/game/missions/resolve-due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
    });

    if (!res.ok) {
        throw new Error('resolve-due failed with status ' + res.status);
    }

    const data = await res.json();
    console.log('resolve-due result:', data);

    // Si el backend devuelve newBalance, podríamos actualizar un marcador de saldo aquí
    if (typeof data.newBalance === 'number') {
        updateUserBalanceInUI(data.newBalance);
    }
}

async function loadMissionsData() {
    try {
        const res = await fetch('/api/game/missions', {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) {
            console.error('Error HTTP al cargar misiones', res.status);
            return;
        }

        const data = await res.json();
        if (!data.ok) {
            console.error('Respuesta API no ok:', data);
            return;
        }

        // Catálogo completo (tabla missions)
        catalog = (data.catalog || []).map(m => {
            let durationLabel = '';
            if (typeof m.durationSeconds === 'number') {
                const mins = Math.round(m.durationSeconds / 60);
                durationLabel = mins <= 1
                    ? `${m.durationSeconds} s`
                    : `${mins} min`;
            }

            return {
                id: m.id,
                name: m.name,
                type: m.type,
                description: m.description,
                cost: m.cost,
                reward: m.reward,
                durationLabel,
                levelRequired: m.levelRequired
            };
        });

        // Misiones del usuario (user_missions + missions)
        missions = (data.missions || []).map(m => {
            const statusLabel = (() => {
                switch (m.status) {
                    case 'running':  return 'En proceso';
                    case 'finished':
                    case 'success':  return 'Finalizada';
                    case 'failed':   return 'Fallida';
                    default:         return m.status || 'Desconocido';
                }
            })();

            const statusClass = (() => {
                switch (m.status) {
                    case 'running':
                        return 'missions-page__status-card--progress';
                    case 'finished':
                    case 'success':
                        return m.rewardApplied
                            ? 'missions-page__status-card--done'
                            : 'missions-page__status-card--claim';
                    case 'failed':
                        return 'missions-page__status-card--failed';
                    default:
                        return 'missions-page__status-card--pending';
                }
            })();

            let durationLabel = '';
            if (typeof m.durationSeconds === 'number') {
                const mins = Math.round(m.durationSeconds / 60);
                durationLabel = mins <= 1
                    ? `${m.durationSeconds} s`
                    : `${mins} min`;
            }

            return {
                id: m.id,
                missionId: m.missionId,
                name: m.name,
                type: m.type,
                description: m.description,
                status: m.status,
                statusLabel,
                statusClass,
                cost: m.costAtStart ?? m.cost,
                reward: m.rewardOnSuccess ?? m.reward,
                durationLabel,
                levelRequired: m.levelRequired,
                costApplied: m.costApplied,
                rewardApplied: m.rewardApplied,
                startedAt: m.startedAt,
                finishedAt: m.finishedAt
            };
        });

        // 2) Pintar columnas
        renderCatalog(catalog);
        renderActive(missions);

        // 3) Configurar temporizadores para misiones en curso
        setupRunningTimers();

    } catch (err) {
        console.error('Error cargando misiones desde API', err);
    }
}


/* ===========================
 *  Render de catálogo y activas
 * =========================== */
const renderCatalog = (list) => {
    if (!list.length) {
        catalogContainer.innerHTML = `
            <p class="missions-page__empty">
                No hay misiones en el catálogo.
            </p>
        `;
        return;
    }

    catalogContainer.innerHTML = list.map(m => `
        <div class="missions-page__card" data-id="${m.id}">
            <span class="missions-page__card-title">${m.name}</span>

            ${m.description ? `
                <p class="missions-page__card-desc">${m.description}</p>
            ` : ''}

            <p class="missions-page__card-economy">
                Coste: ${m.cost?.toLocaleString?.('es-ES') || m.cost} créditos<br>
                Recompensa: ${m.reward?.toLocaleString?.('es-ES') || m.reward} créditos
            </p>

            ${m.durationLabel ? `
                <p class="missions-page__card-duration">
                    Duración estimada: ${m.durationLabel}
                </p>
            ` : ''}

            ${typeof m.levelRequired === 'number' ? `
                <p class="missions-page__card-level">
                    Nivel requerido: ${m.levelRequired}
                </p>
            ` : ''}

            <div class="missions-page__card-actions">
                <button class="btn btn--ghost"   data-action="info">Info</button>
                <button class="btn btn--primary" data-action="activate">Activar</button>
            </div>
        </div>
    `).join('');
};

const renderActive = (list) => {
    if (!list.length) {
        activeContainer.innerHTML = `
            <p class="missions-page__empty">
                No tienes misiones activas todavía.
            </p>
        `;
        return;
    }

    activeContainer.innerHTML = list.map(m => `
        <div class="missions-page__status-card ${m.statusClass}"
             data-id="${m.id}"
             data-status="${m.status || ''}"
             ${m.startedAt ? `data-started-at="${m.startedAt}"` : ''}>
            <div class="missions-page__status-main">
                <span class="missions-page__card-title">${m.name}</span>

                ${m.description ? `
                    <p class="missions-page__card-desc">${m.description}</p>
                ` : ''}

                <p class="missions-page__card-status">
                    Estado: ${m.statusLabel}
                </p>

                <p class="missions-page__card-type">
                    Tipo: ${m.type}
                </p>

                ${m.durationLabel ? `
                    <p class="missions-page__card-duration">
                        Duración estimada: ${m.durationLabel}
                    </p>
                ` : ''}

                <p class="missions-page__card-economy">
                    Coste: ${m.cost?.toLocaleString?.('es-ES') || m.cost} créditos<br>
                    Recompensa: ${m.reward?.toLocaleString?.('es-ES') || m.reward} créditos
                </p>

                ${typeof m.levelRequired === 'number' ? `
                    <p class="missions-page__card-level">
                        Nivel requerido: ${m.levelRequired}
                    </p>
                ` : ''}

                ${m.status === 'running' && m.startedAt ? `
                    <div class="missions-page__timer">
                        <div class="missions-page__timer-icon" aria-hidden="true"></div>
                        <span class="missions-page__timer-label">--:--</span>
                    </div>
                ` : ''}
            </div>

            <div class="missions-page__card-actions">
                <button class="btn btn--ghost" data-action="info">Info</button>

                ${m.status === 'running' ? `
                    <button class="btn btn--danger" data-action="cancel">Cancelar</button>
                ` : ''}

                ${(m.status === 'finished' || m.status === 'success') && !m.rewardApplied ? `
                    <button class="btn btn--success" data-action="claim">Reclamar</button>
                ` : ''}
            </div>
        </div>
    `).join('');
};

/* ===========================
 *  Búsqueda en catálogo
 * =========================== */

function doSearch() {
    const term = (searchInput?.value || '').trim().toLowerCase();
    if (!term) {
        renderCatalog(catalog);
        return;
    }

    const filtered = catalog.filter(m =>
        (m.name || '').toLowerCase().includes(term) ||
        (m.description || '').toLowerCase().includes(term)
    );
    renderCatalog(filtered);
}

function setupSearchHandlers() {
    if (!searchBtn || !searchInput) return;

    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') doSearch();
    });
}

/* ===========================
 *  Listeners de botones
 * =========================== */

function setupCatalogListeners() {
    if (!catalogContainer) return;

    catalogContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const card   = btn.closest('.missions-page__card');
        const id     = card?.dataset.id;
        if (!id) return;

        const mission = catalog.find(m => String(m.id) === String(id));
        if (!mission) {
            console.warn('No se encontró la misión en catálogo para id', id);
            return;
        }

        switch (action) {
            case 'info':
                openMissionInfoModal(mission);
                break;

            case 'activate':
                await handleActivateMission(mission);
                break;
        }
    });
}

function setupActiveListeners() {
    if (!activeContainer) return;

    activeContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const card   = btn.closest('.missions-page__status-card');
        const id     = card?.dataset.id;
        if (!id) return;

        const missionInstance = missions.find(m => String(m.id) === String(id));

        switch (action) {
            case 'info':
                if (missionInstance) {
                    // Buscamos la misión base para info más completa
                    const missionBase = catalog.find(m => m.id === missionInstance.missionId) || missionInstance;
                    openMissionInfoModal(missionBase);
                }
                break;

            case 'cancel':
                // Aquí podrías implementar un futuro endpoint de cancelación
                console.log('Cancelar misión activa (pendiente implementar endpoint)', id);
                break;

            case 'claim':
                // Con la lógica nueva, el "claim" ya no sería necesario,
                // porque la recompensa se aplica al resolver. Lo dejamos de momento como placeholder.
                console.log('Reclamar misión (pendiente implementar, según diseño final)', id);
                break;
        }
    });
}

/* ===========================
 *  Acciones: Activar + Modal Info
 * =========================== */

async function handleActivateMission(mission) {
    const confirmMsg = `¿Quieres activar la misión "${mission.name}" por ${mission.cost} créditos?`;
    const ok = window.confirm(confirmMsg);
    if (!ok) return;

    try {
        const res = await fetch(`/api/game/missions/${mission.id}/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
            if (data.error === 'insufficient_credits') {
                alert('No tienes créditos suficientes para activar esta misión.');
            } else if (data.error === 'no_compatible_aircraft') {
                alert('No tienes ningún avión compatible disponible para esta misión.');
            } else if (data.error === 'mission_not_found') {
                alert('La misión ya no está disponible.');
            } else {
                alert('No se ha podido activar la misión. Inténtalo más tarde.');
            }
            return;
        }

        console.log('Misión activada:', data);

        if (typeof data.newBalance === 'number') {
            updateUserBalanceInUI(data.newBalance);
        }

        alert(
            `Misión "${mission.name}" activada.\n\n` +
            `Duración real simulada: ${data.durationRealSeconds}s (base: ${data.durationPlannedSeconds}s).\n` +
            `El resultado se aplicará cuando vuelvas a esta pantalla tras cumplirse el tiempo.`
        );

        // Volvemos a cargar datos para reflejar la misión en "Activas"
        await loadMissionsData();

    } catch (err) {
        console.error('Error al activar misión', err);
        alert('Error de comunicación con el servidor al activar la misión.');
    }
}

function openMissionInfoModal(mission) {
    const modal = document.getElementById('mission-info-modal');
    if (!modal) {
        // Fallback sencillo si no existe modal
        alert(
            `Misión: ${mission.name}\n\n` +
            `${mission.description || 'Sin descripción disponible.'}\n\n` +
            `Tipo: ${mission.type}\n` +
            `Coste: ${mission.cost} créditos\n` +
            `Recompensa: ${mission.reward} créditos\n` +
            `Duración base: ${mission.durationLabel || 'N/D'}`
        );
        return;
    }

    const titleEl  = modal.querySelector('.mission-modal__title');
    const bodyEl   = modal.querySelector('.mission-modal__body');
    const closeBtn = modal.querySelector('.mission-modal__close');

    titleEl.textContent = mission.name;

    bodyEl.innerHTML = `
        <p>${mission.description || 'Sin descripción disponible.'}</p>
        <p><strong>Tipo:</strong> ${mission.type}</p>
        <p><strong>Coste:</strong> ${mission.cost} créditos</p>
        <p><strong>Recompensa:</strong> ${mission.reward} créditos</p>
        <p><strong>Duración base:</strong> ${mission.durationLabel || 'N/D'}</p>
        ${typeof mission.levelRequired === 'number' ? `
            <p><strong>Nivel requerido:</strong> ${mission.levelRequired}</p>
        ` : ''}
    `;

    modal.classList.add('mission-modal--open');

    const close = () => {
        modal.classList.remove('mission-modal--open');
        closeBtn.removeEventListener('click', close);
        modal.removeEventListener('click', onBackdropClick);
    };

    const onBackdropClick = (e) => {
        if (e.target === modal) {
            close();
        }
    };

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', onBackdropClick);
}

/* ===========================
 *  Utilidad: actualizar saldo en UI (opcional)
 * =========================== */

function updateUserBalanceInUI(newBalance) {
    const el = document.querySelector('.user-balance');
    if (!el) return;
    el.textContent = newBalance.toLocaleString('es-ES');
}

/* ===========================
 *  Temporizador de misiones en curso
 * =========================== */

function setupRunningTimers() {
    // Limpiar cualquier intervalo anterior
    if (missionTimerInterval) {
        clearInterval(missionTimerInterval);
        missionTimerInterval = null;
    }

    const cards = document.querySelectorAll(
        '.missions-page__status-card[data-status="running"][data-started-at]'
    );
    if (!cards.length) return;

    // Preparamos una lista de elementos a actualizar
    const items = [];

    cards.forEach(card => {
        const startStr = card.dataset.startedAt;
        if (!startStr) return;

        const startDate = new Date(startStr);
        if (isNaN(startDate.getTime())) return;

        const label = card.querySelector('.missions-page__timer-label');
        if (!label) return;

        items.push({
            label,
            startMs: startDate.getTime()
        });
    });

    if (!items.length) return;

    const updateAll = () => {
        const now = Date.now();
        items.forEach(item => {
            const elapsedSec = Math.max(0, Math.floor((now - item.startMs) / 1000));
            item.label.textContent = formatElapsedTime(elapsedSec);
        });
    };

    // Actualizamos inmediatamente una vez
    updateAll();
    // Y luego cada segundo
    missionTimerInterval = setInterval(updateAll, 1000);
}

/**
 * Formatea segundos a mm:ss o hh:mm:ss
 */
function formatElapsedTime(totalSeconds) {
    const hours   = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
}
