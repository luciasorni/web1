// /public/js/missions.js
// Misiones: disponibilidad, activación, abortar y tiempos restantes.

let catalogContainer;
let activeContainer;
let completedContainer;
let searchInput;
let searchBtn;

let catalog = [];
let missions = [];
let fleet = [];
let balance = null;
let missionTimerInterval = null;
let resolvingDueMissions = false;

const isCompletedStatus = (status) => {
    const s = (status || '').toLowerCase();
    return ['success', 'failed', 'aborted', 'finished'].includes(s);
};

document.addEventListener('DOMContentLoaded', () => {
    initMissionsPage().catch(err => console.error('Error inicializando misiones', err));
});

async function initMissionsPage() {
    catalogContainer = document.getElementById('missionsCatalog');
    activeContainer  = document.getElementById('missionsActive');
    completedContainer = document.getElementById('missionsCompleted');
    searchInput      = document.getElementById('missionSearch');
    searchBtn        = document.getElementById('missionSearchBtn');

    if (!catalogContainer || !activeContainer) return;

    try { await resolveDueMissions(); } catch (e) { console.warn('resolve-due falló (continúa)', e); }
    await loadAuxData();
    await loadMissionsData();
    setupSearchHandlers();
    setupCatalogListeners();
    setupActiveListeners();
    setupCompletedListeners();
}

async function loadAuxData() {
    try {
        const [fleetRes, econRes] = await Promise.all([
            fetch('/api/game/fleet', { credentials: 'same-origin' }),
            fetch('/api/game/economy', { credentials: 'same-origin' })
        ]);
        if (fleetRes.ok) {
            const d = await fleetRes.json();
            fleet = d.fleet || [];
        }
        if (econRes.ok) {
            const d = await econRes.json();
            if (d.ok && typeof d.balance === 'number') balance = d.balance;
        }
    } catch (err) {
        console.error('Error cargando datos auxiliares', err);
    }
}

async function resolveDueMissions() {
    const res = await fetch('/api/game/missions/resolve-due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
    });
    if (!res.ok) throw new Error('resolve-due ' + res.status);
    const data = await res.json();
    if (typeof data.newBalance === 'number') updateUserBalanceInUI(data.newBalance);
}

async function loadMissionsData() {
    const res = await fetch('/api/game/missions', { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    if (!data.ok) return;

    catalog = (data.catalog || []).map(m => {
        const durationLabel = formatDuration(m.durationSeconds);
        const avail = missionAvailability(m);
        return {
            id: m.id,
            name: m.name,
            type: m.type,
            description: m.description,
            cost: m.cost,
            reward: m.reward,
            durationLabel,
            levelRequired: m.levelRequired,
            availability: avail
        };
    });

    missions = (data.missions || []).map(m => {
        const statusLabel = (() => {
            switch (m.status) {
                case 'running':  return 'En proceso';
                case 'finished':
                case 'success':  return 'Finalizada';
                case 'failed':   return 'Fallida';
                case 'aborted':  return 'Abortada';
                default:         return m.status || 'Desconocido';
            }
        })();

        const statusClass = (() => {
            switch (m.status) {
                case 'running': return 'missions-page__status-card--progress';
                case 'finished':
                case 'success': return m.rewardApplied
                    ? 'missions-page__status-card--done'
                    : 'missions-page__status-card--claim';
                case 'failed':
                case 'aborted': return 'missions-page__status-card--failed';
                default:        return 'missions-page__status-card--pending';
            }
        })();

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
            durationLabel: formatDuration(m.durationSeconds),
            levelRequired: m.levelRequired,
            costApplied: m.costApplied,
            rewardApplied: m.rewardApplied,
            startedAt: m.startedAt,
            finishedAt: m.finishedAt,
            aircraftId: m.aircraftId
        };
    });

    const activeList = missions.filter(m => !isCompletedStatus(m.status));
    const completedList = missions
        .filter(m => isCompletedStatus(m.status))
        .sort((a, b) => {
            const da = Date.parse(a.finishedAt || a.updatedAt || a.startedAt || 0);
            const db = Date.parse(b.finishedAt || b.updatedAt || b.startedAt || 0);
            return da - db; // menos reciente → más reciente
        });

    renderCatalog(catalog);
    renderActive(activeList);
    renderCompleted(completedList);
    setupRunningTimers();
}

const renderCatalog = (list) => {
    if (!list.length) {
        catalogContainer.innerHTML = `<p class="missions-page__empty">No hay misiones en el catálogo.</p>`;
        return;
    }
    catalogContainer.innerHTML = list.map(m => `
        <div class="missions-page__card" data-id="${m.id}">
            <span class="missions-page__card-title">${m.name}</span>
            ${m.description ? `<p class="missions-page__card-desc">${m.description}</p>` : ''}
            <p class="missions-page__card-economy">
                Coste: ${fmt(m.cost)} créditos<br>
                Recompensa: ${fmt(m.reward)} créditos
            </p>
            ${m.durationLabel ? `<p class="missions-page__card-duration">Duración estimada: ${m.durationLabel}</p>` : ''}
            ${typeof m.levelRequired === 'number' ? `<p class="missions-page__card-level">Nivel requerido: ${m.levelRequired}</p>` : ''}
            <div class="missions-page__availability ${m.availability.available ? 'ok' : 'ko'}">
                ${availabilityLabel(m.availability)}
            </div>
            <div class="missions-page__card-actions">
                <button class="btn btn--ghost"   data-action="info">Info</button>
                <button class="btn btn--primary" data-action="activate" ${m.availability.available ? '' : 'disabled'}>
                    ${m.availability.available ? 'Activar' : 'No disponible'}
                </button>
            </div>
        </div>
    `).join('');
};

const renderActive = (list) => {
    if (!list.length) {
        activeContainer.innerHTML = `<p class="missions-page__empty">No tienes misiones activas todavía.</p>`;
        return;
    }
    activeContainer.innerHTML = list.map(m => {
        const remaining = m.status === 'running' && m.finishedAt ? ` · ${remainingLabel(m.finishedAt)}` : '';
        return `
        <div class="missions-page__status-card ${m.statusClass}"
             data-id="${m.id}"
             data-status="${m.status || ''}"
             ${m.startedAt ? `data-started-at="${m.startedAt}"` : ''}
             ${m.finishedAt ? `data-finished-at="${m.finishedAt}"` : ''}>
            <div class="missions-page__status-main">
                <span class="missions-page__card-title">${m.name}</span>
                ${m.description ? `<p class="missions-page__card-desc">${m.description}</p>` : ''}
                <p class="missions-page__card-status">Estado: ${m.statusLabel}${remaining}</p>
                <p class="missions-page__card-type">Tipo: ${m.type}</p>
                ${m.durationLabel ? `<p class="missions-page__card-duration">Duración estimada: ${m.durationLabel}</p>` : ''}
                <p class="missions-page__card-economy">
                    Coste: ${fmt(m.cost)} créditos<br>
                    Recompensa: ${fmt(m.reward)} créditos
                </p>
                ${typeof m.levelRequired === 'number' ? `<p class="missions-page__card-level">Nivel requerido: ${m.levelRequired}</p>` : ''}
                ${m.status === 'running' && m.startedAt ? `
                    <div class="missions-page__timer">
                        <div class="missions-page__timer-icon" aria-hidden="true"></div>
                        <span class="missions-page__timer-label">--:--</span>
                    </div>
                ` : ''}
            </div>
            <div class="missions-page__card-actions">
                <button class="btn btn--ghost" data-action="info">Info</button>
                ${m.status === 'running' ? `<button class="btn btn--danger" data-action="abort">Abortar</button>` : ''}
            </div>
        </div>
    `;
    }).join('');
};

const renderCompleted = (list) => {
    if (!completedContainer) return;
    if (!list.length) {
        completedContainer.innerHTML = `<p class="missions-page__empty">Aún no hay misiones completadas.</p>`;
        return;
    }
    completedContainer.innerHTML = list.map(m => `
        <div class="missions-page__status-card ${m.statusClass}"
             data-id="${m.id}"
             data-status="${m.status || ''}">
            <div class="missions-page__status-main">
                <span class="missions-page__card-title">${m.name}</span>
                ${m.description ? `<p class="missions-page__card-desc">${m.description}</p>` : ''}
                <p class="missions-page__card-status">Estado: ${m.statusLabel}</p>
                <p class="missions-page__card-type">Tipo: ${m.type}</p>
                ${m.durationLabel ? `<p class="missions-page__card-duration">Duración estimada: ${m.durationLabel}</p>` : ''}
                <p class="missions-page__card-economy">
                    Coste: ${fmt(m.cost)} créditos<br>
                    Recompensa: ${fmt(m.reward)} créditos
                </p>
                ${typeof m.levelRequired === 'number' ? `<p class="missions-page__card-level">Nivel requerido: ${m.levelRequired}</p>` : ''}
            </div>
            <div class="missions-page__card-actions">
                <button class="btn btn--ghost" data-action="info">Info</button>
            </div>
        </div>
    `).join('');
};

function setupSearchHandlers() {
    if (!searchBtn || !searchInput) return;
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') doSearch(); });
}

function doSearch() {
    const term = (searchInput?.value || '').trim().toLowerCase();
    if (!term) { renderCatalog(catalog); return; }
    const filtered = catalog.filter(m =>
        (m.name || '').toLowerCase().includes(term) ||
        (m.description || '').toLowerCase().includes(term)
    );
    renderCatalog(filtered);
}

function setupCatalogListeners() {
    if (!catalogContainer) return;
    catalogContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const card = btn.closest('.missions-page__card');
        const id = card?.dataset.id;
        if (!id) return;
        const mission = catalog.find(m => String(m.id) === String(id));
        if (!mission) return;

        if (action === 'info') {
            openMissionInfoModal(mission);
        } else if (action === 'activate' && mission.availability.available) {
            await handleActivateMission(mission);
        }
    });
}

function setupActiveListeners() {
    if (!activeContainer) return;
    activeContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const card = btn.closest('.missions-page__status-card');
        const id = card?.dataset.id;
        const missionInstance = missions.find(m => String(m.id) === String(id));
        if (!missionInstance) return;

        switch (action) {
            case 'info': {
                const base = catalog.find(m => m.id === missionInstance.missionId) || missionInstance;
                openMissionInfoModal(base);
                break;
            }
            case 'abort':
                handleAbortMission(missionInstance.id);
                break;
        }
    });
}

function setupCompletedListeners() {
    if (!completedContainer) return;
    completedContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.missions-page__status-card');
        if (!card) return;
        const id = card.dataset.id;
        const missionInstance = missions.find(m => String(m.id) === String(id));
        if (!missionInstance) return;
        const base = catalog.find(m => m.id === missionInstance.missionId) || missionInstance;
        openMissionInfoModal(base);
    });
}

async function handleActivateMission(mission) {
    const ok = window.confirm(`¿Activar la misión "${mission.name}" por ${mission.cost} créditos?`);
    if (!ok) return;

    try {
        const res = await fetch(`/api/game/missions/${mission.id}/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
            if (data.error === 'insufficient_credits') alert('No tienes créditos suficientes para esta misión.');
            else if (data.error === 'no_compatible_aircraft') alert('No tienes avión compatible libre.');
            else if (data.error === 'mission_not_found') alert('La misión ya no está disponible.');
            else alert('No se pudo activar la misión.');
            return;
        }

        if (typeof data.newBalance === 'number') updateUserBalanceInUI(data.newBalance);

        if (data.aircraftId) {
            const params = new URLSearchParams({
                takeoff: data.aircraftId,
                um: data.userMissionId || '',
                finish: data.plannedFinishedAt || ''
            });
            window.location.href = `/game?${params.toString()}`;
            return;
        }

        await loadMissionsData();
    } catch (err) {
        console.error('Error al activar misión', err);
        alert('Error de comunicación con el servidor al activar la misión.');
    }
}

async function handleAbortMission(userMissionId) {
    const ok = window.confirm('¿Seguro que quieres abortar esta misión? No se recuperarán costes ni recompensas.');
    if (!ok) return;
    try {
        const res = await fetch(`/api/game/missions/${userMissionId}/abort`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
            alert('No se pudo abortar la misión.');
            return;
        }
        await loadMissionsData();
    } catch (err) {
        console.error('Error abortando misión', err);
        alert('Error de comunicación al abortar.');
    }
}

function openMissionInfoModal(mission) {
    const modal = document.getElementById('mission-info-modal');
    if (!modal) {
        alert(
            `Misión: ${mission.name}\n\n` +
            `${mission.description || 'Sin descripción.'}\n\n` +
            `Tipo: ${mission.type}\n` +
            `Coste: ${mission.cost} créditos\n` +
            `Recompensa: ${mission.reward} créditos\n` +
            `Duración base: ${mission.durationLabel || 'N/D'}\n` +
            `Disponibilidad: ${availabilityLabel(mission.availability)}`
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
        ${typeof mission.levelRequired === 'number' ? `<p><strong>Nivel requerido:</strong> ${mission.levelRequired}</p>` : ''}
        <p><strong>Disponibilidad:</strong> ${availabilityLabel(mission.availability)}</p>
    `;

    modal.classList.add('mission-modal--open');

    const close = () => {
        modal.classList.remove('mission-modal--open');
        closeBtn.removeEventListener('click', close);
        modal.removeEventListener('click', onBackdropClick);
    };

    const onBackdropClick = (e) => { if (e.target === modal) close(); };

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', onBackdropClick);
}

function missionAvailability(mission) {
    const hasAircraft = fleet.some(a =>
        a.status === 'idle' &&
        (a.typeId === mission.type || a.role === mission.type)
    );
    const hasBalance = typeof balance === 'number' ? balance >= (mission.cost || 0) : true;
    return {
        available: hasAircraft && hasBalance,
        hasAircraft,
        hasBalance
    };
}

function availabilityLabel(av) {
    if (!av) return 'Disponibilidad desconocida';
    if (av.available) return 'Disponible';
    if (!av.hasAircraft && !av.hasBalance) return 'Sin saldo ni avión compatible';
    if (!av.hasAircraft) return 'Sin avión compatible libre';
    return 'Sin saldo suficiente';
}

function updateUserBalanceInUI(newBalance) {
    const el = document.querySelector('.user-balance');
    if (!el) return;
    el.textContent = newBalance.toLocaleString('es-ES');
}

function setupRunningTimers() {
    if (missionTimerInterval) { clearInterval(missionTimerInterval); missionTimerInterval = null; }

    const cards = document.querySelectorAll('.missions-page__status-card[data-status="running"][data-started-at]');
    if (!cards.length) return;

    const items = [];
    cards.forEach(card => {
        const startStr = card.dataset.startedAt;
        const finishStr = card.dataset.finishedAt;
        const startDate = new Date(startStr);
        const finishDate = finishStr ? new Date(finishStr) : null;
        const label = card.querySelector('.missions-page__timer-label');
        if (isNaN(startDate.getTime()) || !label) return;
        items.push({
            label,
            startMs: startDate.getTime(),
            finishMs: finishDate && !isNaN(finishDate.getTime()) ? finishDate.getTime() : null
        });
    });
    if (!items.length) return;

    const checkDueAndResolve = () => {
        if (resolvingDueMissions) return;
        const nowMs = Date.now();
        const hasDue = items.some(item => item.finishMs && item.finishMs <= nowMs);
        if (!hasDue) return;

        resolvingDueMissions = true;
        resolveDueMissions()
            .then(() => loadMissionsData())
            .catch(err => console.warn('No se pudo resolver misiones vencidas', err))
            .finally(() => { resolvingDueMissions = false; });
    };

    const updateAll = () => {
        const now = Date.now();
        items.forEach(item => {
            const elapsedSec = Math.max(0, Math.floor((now - item.startMs) / 1000));
            item.label.textContent = formatElapsedTime(elapsedSec);
        });
        checkDueAndResolve();
    };

    updateAll();
    missionTimerInterval = setInterval(updateAll, 1000);
}

function formatDuration(seconds) {
    if (typeof seconds !== 'number') return '';
    const mins = Math.round(seconds / 60);
    return mins <= 1 ? `${seconds} s` : `${mins} min`;
}

function formatElapsedTime(totalSeconds) {
    const hours   = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
}

function remainingLabel(finishIso) {
    if (!finishIso) return '';
    const ms = Date.parse(finishIso) - Date.now();
    if (ms <= 0) return 'llegando';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function fmt(n) {
    return typeof n === 'number' ? n.toLocaleString('es-ES') : (n ?? 'N/D');
}
