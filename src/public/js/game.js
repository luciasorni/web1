// /public/js/game.js
// Aeropuerto minimal: 5 hangares, pista gris. Muestra tiempo restante de misiones y animación sencilla.

const PLANE_SPRITES = {
    commercial_passenger: '/img/aviones_desde_arriba/avionpersonas2motores.png',
    commercial_cargo: '/img/aviones_desde_arriba/avion4motorespersonas.png',
    military_attack: '/img/aviones_desde_arriba/Militar-F15.webp',
    military_recon: '/img/aviones_desde_arriba/B2.png',
    military_transport: '/img/aviones_desde_arriba/avion4motorespersonas.png',
    default: '/img/aviones_desde_arriba/avionpersonas2motores.png'
};

let fleetCache = [];
let runningMissionsByAircraft = {};
let remainingTimer = null;
let airportInfo = null;
const XP_PER_LEVEL = 100;

document.addEventListener('DOMContentLoaded', () => {
    initGameView().catch(err => console.error(err));
    setupEasterEgg();
});

async function initGameView() {
    const params = new URLSearchParams(window.location.search);
    const takeoffId = params.get('takeoff');
    const finishAt = params.get('finish');

    const { fleet } = await loadFleet();
    await loadBalance();
    await loadRunningMissions();
    renderKpis(fleet);
    updateLevelKpi();

    renderHangars(fleet, takeoffId);
    startRemainingTicker();

    if (takeoffId) {
        const aircraft = fleet.find(a => String(a.id) === String(takeoffId));
        if (aircraft) animateTakeoff(aircraft, finishAt);
    }
}

async function loadFleet() {
    try {
        const res = await fetch('/api/game/fleet', { credentials: 'same-origin' });
        if (!res.ok) return { fleet: [] };
        const data = await res.json();
        fleetCache = data.fleet || [];
        return { fleet: fleetCache };
    } catch (err) {
        console.error('Error loading fleet', err);
        return { fleet: [] };
    }
}

async function loadBalance() {
    try {
        const res = await fetch('/api/game/economy', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && typeof data.balance === 'number') {
            setKpi('kpi-balance', data.balance.toLocaleString('es-ES'));
        }
    } catch (err) {
        console.error('Error loading balance', err);
    }
}

async function loadRunningMissions() {
    try {
        const res = await fetch('/api/game/missions', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const running = {};
        (data.missions || []).forEach(m => {
            if (m.status === 'running' && m.aircraftId && m.finishedAt) {
                running[String(m.aircraftId)] = m.finishedAt;
            }
        });
        runningMissionsByAircraft = running;
        airportInfo = data.airport || airportInfo;
    } catch (err) {
        console.error('Error loading missions for remaining time', err);
    }
}

function renderKpis(fleet) {
    const active = fleet.filter(a => a.status === 'running').length;
    setKpi('kpi-active', active);
    setKpi('kpi-hangar', fleet.length);
}

function renderHangars(fleet, takeoffId) {
    const grid = document.getElementById('hangarGrid');
    if (!grid) return;

    const labels = ['A1', 'B2', 'C3', 'D4', 'E5'];
    const slots = Array(5).fill(null);
    fleet.slice(0, 5).forEach((a, idx) => { slots[idx] = a; });

    grid.innerHTML = slots.map((a, idx) => {
        const isTakeoff = a && a.id === takeoffId;
        const remaining = a ? remainingLabel(a.id) : '';
        const state = !a ? 'Libre' :
            isTakeoff ? 'En pista' :
            a.status === 'running' ? `En misión${remaining ? ' · ' + remaining : ''}` :
            a.status === 'maintenance' ? 'Mantenimiento' : 'Aparcado';

        const thumb = a ? `<div class="hangar-thumb" style="background-image:url('${pickPlaneSprite(a)}');"></div>` : '';

        return `
            <article class="hangar-card ${a ? 'hangar-card--occupied' : ''} ${isTakeoff ? 'hangar-card--takeoff' : ''}"
                     data-slot="${idx}"
                     data-aircraft-id="${a ? a.id : ''}">
                <div class="hangar-card__roof"></div>
                <div class="hangar-card__body">
                    <div class="hangar-card__label">Hangar ${labels[idx]}</div>
                    <div class="hangar-card__meta">${state}${a ? ` · ${a.model}` : ''}</div>
                    ${thumb}
                    ${a ? `<div class="hangar-card__tag">${a.nickname || a.model}</div>` : ''}
                </div>
            </article>
        `;
    }).join('');
}

function animateTakeoff(aircraft, finishAtIso) {
    const scene = document.querySelector('.airport-scene');
    const runway = document.querySelector('.runway');
    const hangars = document.querySelectorAll('.hangar-card');
    if (!scene || !runway || !hangars.length) return;

    const hangarEl = Array.from(hangars).find(h => h.dataset.aircraftId === String(aircraft.id));
    if (hangarEl) {
        hangarEl.classList.remove('hangar-card--occupied');
        hangarEl.classList.add('hangar-card--takeoff');
        hangarEl.dataset.aircraftId = '';
        hangarEl.querySelector('.hangar-thumb')?.remove();
        hangarEl.querySelector('.hangar-card__tag')?.remove();
        const meta = hangarEl.querySelector('.hangar-card__meta');
        if (meta) meta.textContent = 'En pista...';
    }

    const plane = document.createElement('div');
    plane.className = 'plane-sprite';
    plane.style.backgroundImage = `url("${pickPlaneSprite(aircraft)}")`;
    scene.appendChild(plane);

    const path = buildSimpleRunwayPath(scene, runway);
    runPathAnimation(plane, path, true, () => {
        if (hangarEl) {
            const meta = hangarEl.querySelector('.hangar-card__meta');
            if (meta) meta.textContent = 'En misión';
        }
        plane.remove();
        const now = Date.now();
        const finishMs = finishAtIso ? Date.parse(finishAtIso) : null;
        const waitMs = finishMs ? Math.max(0, finishMs - now) : 12000;
        setTimeout(() => animateLanding(aircraft, hangarEl), Math.min(waitMs, 20000));
    });
}

function animateLanding(aircraft, hangarEl) {
    const scene = document.querySelector('.airport-scene');
    const runway = document.querySelector('.runway');
    if (!scene || !runway || !hangarEl) return;

    const plane = document.createElement('div');
    plane.className = 'plane-sprite plane-sprite--landing';
    plane.style.backgroundImage = `url("${pickPlaneSprite(aircraft)}")`;
    scene.appendChild(plane);

    const path = buildLandingPath(scene, runway, hangarEl);
    runPathAnimation(plane, path, false, () => {
        plane.remove();
        const meta = hangarEl.querySelector('.hangar-card__meta');
        const body = hangarEl.querySelector('.hangar-card__body');
        if (body && !hangarEl.querySelector('.hangar-thumb')) {
            const thumb = document.createElement('div');
            thumb.className = 'hangar-thumb';
            thumb.style.backgroundImage = `url("${pickPlaneSprite(aircraft)}")`;
            body.insertBefore(thumb, meta?.nextSibling || null);
        }
        hangarEl.classList.add('hangar-card--occupied');
        hangarEl.dataset.aircraftId = aircraft.id;
        if (meta) meta.textContent = `Aparcado · ${aircraft.model}`;
    });
}

function buildSimpleRunwayPath(scene, runway) {
    const sceneRect = scene.getBoundingClientRect();
    const runwayRect = runway.getBoundingClientRect();
    const start = {
        x: runwayRect.left + runwayRect.width * 0.12 - sceneRect.left - 48,
        y: runwayRect.top + runwayRect.height * 0.55 - sceneRect.top - 48
    };
    const end = {
        x: runwayRect.right - sceneRect.left + 300,
        y: runwayRect.top - sceneRect.top - 280
    };
    return [
        { x: start.x, y: start.y, angle: 0 },
        { x: (start.x + end.x) / 2, y: start.y - 20, angle: 2, takeoff: true },
        { x: end.x, y: end.y, angle: 6, takeoff: true }
    ];
}

function buildLandingPath(scene, runway, hangarEl) {
    const sceneRect = scene.getBoundingClientRect();
    const runwayRect = runway.getBoundingClientRect();
    const endRect = hangarEl.getBoundingClientRect();

    const start = {
        x: runwayRect.right - sceneRect.left - 140,
        y: runwayRect.top - sceneRect.top - 120
    };
    const touch = {
        x: runwayRect.left + runwayRect.width * 0.6 - sceneRect.left - 48,
        y: runwayRect.top + runwayRect.height * 0.45 - sceneRect.top - 48
    };
    const end = {
        x: endRect.left + endRect.width / 2 - sceneRect.left - 48,
        y: endRect.top + endRect.height / 2 - sceneRect.top - 48
    };

    return [
        { x: start.x, y: start.y, angle: -6 },
        { x: touch.x, y: touch.y, angle: -2 },
        { x: end.x, y: end.y, angle: 0 }
    ];
}

function runPathAnimation(node, points, liftZoom, onFinish) {
    if (!points.length) return;
    const totalDur = 8000;
    const segDur = totalDur / points.length;

    let startTime = null;
    const startPoint = points[0];
    node.style.left = `${startPoint.x}px`;
    node.style.top = `${startPoint.y}px`;
    node.style.opacity = 1;
    node.style.transform = `translate(0,0) rotate(${startPoint.angle || 0}deg)`;

    function step(ts) {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        const segIndex = Math.min(points.length - 2, Math.floor(elapsed / segDur));
        const segProgress = Math.min(1, (elapsed - segIndex * segDur) / segDur);

        const p1 = points[segIndex];
        const p2 = points[segIndex + 1];
        const x = lerp(p1.x, p2.x, segProgress);
        const y = lerp(p1.y, p2.y, segProgress);
        const angle = angleBetween(p1, p2) + 90;
        const totalProg = Math.min(1, elapsed / totalDur);
        const scale = liftZoom && p2.takeoff ? 1 + totalProg * 1.2 : 1;

        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.transform = `translate(0,0) rotate(${angle}deg) scale(${scale})`;

        if (elapsed < totalDur) {
            requestAnimationFrame(step);
        } else {
            onFinish?.();
        }
    }
    requestAnimationFrame(step);
}

function pickPlaneSprite(a) {
    if (!a) return PLANE_SPRITES.default;
    return PLANE_SPRITES[a.role] || PLANE_SPRITES.default;
}

function levelFromXp(xp = 0) {
    return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

function updateLevelKpi() {
    const lvl = airportInfo?.level ?? (airportInfo ? levelFromXp(airportInfo.xp || 0) : null);
    setKpi('kpi-level', lvl ? `Nivel ${lvl}` : '--');
    const label = document.querySelector('#kpi-level .kpi-label');
    if (label) label.textContent = 'Nivel aeropuerto';
}

function setKpi(id, value) {
    const card = document.getElementById(id);
    if (!card) return;
    const v = card.querySelector('.kpi-value');
    if (v) v.textContent = typeof value === 'number' ? value.toLocaleString('es-ES') : (value ?? '--');
}

function lerp(a, b, t) { return a + (b - a) * t; }
function angleBetween(p1, p2) { return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI; }

function remainingLabel(aircraftId) {
    const iso = runningMissionsByAircraft[String(aircraftId)];
    if (!iso) return '';
    const ms = Date.parse(iso) - Date.now();
    if (ms <= 0) return 'llegando';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function startRemainingTicker() {
    if (remainingTimer) clearInterval(remainingTimer);
    remainingTimer = setInterval(() => {
        document.querySelectorAll('.hangar-card').forEach(card => {
            const id = card.dataset.aircraftId;
            if (!id) return;
            const meta = card.querySelector('.hangar-card__meta');
            if (!meta) return;
            if (card.classList.contains('hangar-card--takeoff')) return;
            const iso = runningMissionsByAircraft[String(id)];
            if (!iso) return;
            const lbl = remainingLabel(id);
            if (lbl) meta.textContent = `En misión · ${lbl}`;
        });
    }, 1000);
}

// Easter egg: 5 clics en "Torre de control" -> lluvia de aviones
function setupEasterEgg() {
    const trigger = document.querySelector('.subtitle');
    if (!trigger) return;
    let clicks = 0;
    let timer = null;
    trigger.addEventListener('click', () => {
        clicks++;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { clicks = 0; }, 1200);
        if (clicks >= 5) {
            clicks = 0;
            spawnFlock();
        }
    });
}

function spawnFlock() {
    const scene = document.querySelector('.airport-scene');
    if (!scene) return;
    const count = 20;
    for (let i = 0; i < count; i++) {
        const plane = document.createElement('div');
        plane.className = 'plane-sprite';
        plane.style.backgroundImage = `url("${PLANE_SPRITES.default}")`;
        plane.style.opacity = 1;
        plane.style.width = '72px';
        plane.style.height = '72px';
        plane.style.left = `${-200 - Math.random() * 200}px`;
        plane.style.top = `${Math.random() * (scene.offsetHeight * 0.6)}px`;
        scene.appendChild(plane);

        const endX = scene.offsetWidth + 400;
        const endY = plane.offsetTop - 200 + Math.random() * 120;
        plane.animate([
            { transform: `translate(0,0) rotate(90deg) scale(0.9)`, opacity: 1 },
            { transform: `translate(${endX}px, ${endY}px) rotate(110deg) scale(1.4)`, opacity: 0.3 }
        ], {
            duration: 5000 + Math.random() * 2000,
            easing: 'ease-out',
            fill: 'forwards'
        }).onfinish = () => plane.remove();
    }
}
