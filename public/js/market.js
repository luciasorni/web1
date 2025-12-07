// /public/js/market.js
// Mercado: comprar aviones nuevos (catálogo) y vender aviones propios

let catalog = [];
let owned = [];
let balance = null;
let currentFilter = { type: 'all', min: 0, max: Number.MAX_SAFE_INTEGER };

document.addEventListener('DOMContentLoaded', async () => {
    const switchMode = document.getElementById('switchMode');
    const buySection = document.getElementById('buySection');
    const sellSection = document.getElementById('sellSection');
    const toggleBtn = document.getElementById('toggleFilters');
    const panel = document.getElementById('filtersPanel');
    const fTipo = document.getElementById('fTipo');
    const fPriceMin = document.getElementById('fPriceMin');
    const fPriceMax = document.getElementById('fPriceMax');
    const btnApply = document.getElementById('applyFilters');
    const btnClear = document.getElementById('clearFilters');

    await loadMarket();
    renderBuy();
    renderSell();
    updateBalance();

    switchMode?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        switchMode.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        if (mode === 'buy') {
            buySection.classList.add('active');
            sellSection.classList.remove('active');
        } else {
            sellSection.classList.add('active');
            buySection.classList.remove('active');
        }
    });

    toggleBtn?.addEventListener('click', () => {
        const open = panel.classList.contains('open');
        panel.classList.toggle('open', !open);
        panel.setAttribute('aria-hidden', open ? 'true' : 'false');
        toggleBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });

    btnApply?.addEventListener('click', () => {
        currentFilter.type = fTipo.value || 'all';
        currentFilter.min = Number(fPriceMin.value || 0);
        currentFilter.max = Number(fPriceMax.value || Number.MAX_SAFE_INTEGER);
        renderBuy();
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        toggleBtn.setAttribute('aria-expanded', 'false');
    });

    btnClear?.addEventListener('click', () => {
        fTipo.value = 'all';
        fPriceMin.value = '';
        fPriceMax.value = '';
        currentFilter = { type: 'all', min: 0, max: Number.MAX_SAFE_INTEGER };
        renderBuy();
    });
});

async function loadMarket() {
    try {
        const res = await fetch('/api/game/market', { credentials: 'same-origin' });
        if (!res.ok) {
            console.error('Market API error', res.status);
            return;
        }
        const data = await res.json();
        if (!data.ok) {
            console.error('Market API not ok', data);
            return;
        }
        catalog = data.catalog || [];
        owned = data.fleet || [];
        await fetchBalance();
    } catch (err) {
        console.error('Error loading market', err);
    }
}

function renderBuy() {
    const buyGrid = document.getElementById('buyGrid');
    if (!buyGrid) return;
    const list = catalog.filter(c => {
        const inType = currentFilter.type === 'all' || c.role === currentFilter.type;
        const price = Number(c.basePrice) || 0;
        const inPrice = price >= currentFilter.min && price <= currentFilter.max;
        return inType && inPrice;
    });

    buyGrid.innerHTML = list.map(item => `
      <article class="mcard">
        <div class="mcard__img">
          <img src="/img/aircraft/${item.id}.jpeg" alt="${item.model}">
        </div>
        <div class="mcard__body">
          <div class="mrow">
            <span class="mname">${item.model}</span>
            <span class="mprice">${(Number(item.basePrice) || 0).toLocaleString('es-ES')} créditos</span>
          </div>
          <div class="mrow mmeta">
            <span>${roleLabel(item.role)}</span>
          </div>
          ${item.description ? `<p class="mmeta">${item.description}</p>` : ''}
          <div class="mactions">
            <button class="btn btn--primary" data-buy="${item.id}">Comprar</button>
          </div>
        </div>
      </article>
    `).join('');

    buyGrid.querySelectorAll('[data-buy]').forEach(btn => {
        btn.addEventListener('click', () => buyAircraft(btn.dataset.buy, btn));
    });
}

function renderSell() {
    const sellList = document.getElementById('sellList');
    if (!sellList) return;
    if (!owned.length) {
        sellList.innerHTML = '<p>No tienes aviones para vender.</p>';
        return;
    }
    sellList.innerHTML = owned.map(a => {
        const sale = estimateSale(a);
        return `
          <div class="sellcard">
            <div class="sellcard__img">
              <img src="/img/aircraft/${a.typeId}.jpeg" alt="${a.model}">
            </div>
            <div class="sellcard__info">
              <div class="sellcard__row"><b>${a.nickname || a.model}</b> · ${roleLabel(a.role)}</div>
              <div class="sellcard__row">Valor estimado: <b>${sale.toLocaleString('es-ES')} créditos</b></div>
              ${a.purchasedAt ? `<div class="sellcard__row">Comprado: ${formatDate(a.purchasedAt)}</div>` : ''}
            </div>
            <div class="sellcard__actions">
              <button class="btn btn--danger" data-sell="${a.id}">Vender</button>
            </div>
          </div>
        `;
    }).join('');

    sellList.querySelectorAll('[data-sell]').forEach(btn => {
        btn.addEventListener('click', () => sellAircraft(btn.dataset.sell, btn));
    });
}

async function buyAircraft(typeId, btn) {
    if (!typeId) return;
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Comprando...';
    try {
        const res = await fetch('/api/game/fleet/buy', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aircraftTypeId: typeId })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
            if (data.error === 'insufficient_credits') {
                alert('No tienes créditos suficientes.');
            } else if (data.error === 'fleet_limit') {
                alert('Límite de flota alcanzado (6 aviones activos). Vende uno antes de comprar.');
            } else {
                alert('No se pudo completar la compra.');
            }
            return;
        }
        if (data.aircraft) {
            owned.push(data.aircraft);
        }
        if (typeof data.credits === 'number') {
            balance = data.credits;
            updateBalance();
        }
        renderSell();
    } catch (err) {
        console.error('Buy aircraft error', err);
        alert('Error al comprar.');
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
}

async function sellAircraft(aircraftId, btn) {
    if (!aircraftId) return;
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Vendiendo...';
    try {
        const res = await fetch('/api/game/market/sell', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aircraftId })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
            if (data.error === 'aircraft_busy') {
                alert('No puedes vender un avión que está en misión.');
            } else {
                alert('No se pudo vender este avión.');
            }
            return;
        }
        owned = owned.filter(a => a.id !== aircraftId);
        if (typeof data.credits === 'number') {
            balance = data.credits;
            updateBalance();
        }
        renderSell();
    } catch (err) {
        console.error('Sell aircraft error', err);
        alert('Error al vender.');
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
}

function roleLabel(role) {
    switch (role) {
        case 'commercial_passenger': return 'Pasajeros';
        case 'commercial_cargo': return 'Carga';
        case 'military_transport': return 'Transporte militar';
        case 'military_recon': return 'Reconocimiento';
        case 'military_attack': return 'Ataque';
        default: return role || '';
    }
}

function estimateSale(a) {
    const base = Number(a.purchasedPrice || a.basePrice || 0);
    return Math.max(0, Math.round(base * 0.7));
}

function formatDate(d) {
    const date = new Date(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-ES');
}

function updateBalance() {
    const el = document.getElementById('marketBalance');
    if (!el) return;
    const value = typeof balance === 'number' ? balance.toLocaleString('es-ES') : '--';
    el.textContent = `Créditos: ${value}`;
}

async function fetchBalance() {
    try {
        const res = await fetch('/api/game/economy', { credentials: 'same-origin' });
        const data = await res.json();
        if (data.ok && typeof data.balance === 'number') {
            balance = data.balance;
            updateBalance();
        }
    } catch (err) {
        console.error('Error fetching balance', err);
    }
}
