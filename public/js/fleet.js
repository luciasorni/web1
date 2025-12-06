// public/js/fleet.js
// Vista de flota: solo muestra aviones propios (sin compras)

let owned = [];
let currentFilter = 'all';
let credits = null;

document.addEventListener('DOMContentLoaded', async () => {
    const gridOwned   = document.getElementById('fleetOwnedGrid');
    const filters     = document.getElementById('filters');
    const balanceEl   = document.getElementById('fleetBalance');

    if (!gridOwned || !filters) {
        console.error('Fleet: missing DOM elements');
        return;
    }

    try {
        const res = await fetch('/api/game/fleet', { credentials: 'same-origin' });
        if (!res.ok) {
            console.error('Fleet API error:', res.status);
            return;
        }
        const data = await res.json();
        if (!data.ok) {
            console.error('Fleet API responded not-ok:', data);
            return;
        }

        owned = data.fleet.map(a => ({
            id: a.id,
            typeId: a.typeId,
            role: a.role,
            status: a.status,
            nickname: a.nickname || '',
            displayName: a.nickname || a.model || a.id,
            model: a.model,
            description: a.description,
            basePrice: Number(a.basePrice) || 0,
            purchasedPrice: a.purchasedPrice != null ? Number(a.purchasedPrice) : null,
            purchasedAtLabel: formatDate(a.purchasedAt),
            imageUrl: `/img/aircraft/${a.typeId}.jpeg`
        }));

        applyFilter();
        await loadBalance(balanceEl);

        filters.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-type]');
            if (!btn) return;

            [...filters.querySelectorAll('.fleet-chip')]
                .forEach(chip => chip.classList.toggle('fleet-chip--active', chip === btn));

            currentFilter = btn.dataset.type || 'all';
            applyFilter();
        });

    } catch (err) {
        console.error('Error loading fleet data:', err);
    }
});

function applyFilter() {
    const gridOwned   = document.getElementById('fleetOwnedGrid');

    if (!gridOwned) return;

    if (currentFilter === 'all') {
        renderOwned(gridOwned, owned);
    } else {
        renderOwned(
            gridOwned,
            owned.filter(a => a.role === currentFilter)
        );
    }
}

function renderOwned(gridOwned, list) {
    if (!list.length) {
        gridOwned.innerHTML = '<p>No tienes aviones aún. Consíguelos en el mercado.</p>';
        return;
    }
    gridOwned.innerHTML = list.map(a => card(a)).join('');
}

function card(a) {
    const priceLabel = typeof a.basePrice === 'number'
        ? a.basePrice.toLocaleString('es-ES')
        : (a.basePrice ?? 'N/D');

    const purchasedPriceLabel = (typeof a.purchasedPrice === 'number')
        ? a.purchasedPrice.toLocaleString('es-ES')
        : a.purchasedPrice;

    const title = a.displayName || a.model || a.id;
    const subtitle = a.model && a.model !== title ? a.model : '';

    return `
    <article class="fleet-card">
      <div class="fleet-card__img">
        <img src="${a.imageUrl}" alt="${a.model}" class="fleet-card__img-tag" />
      </div>

      <div class="fleet-card__body">

        <div class="fleet-card__top">
          <span class="badge badge--type">${roleLabel(a.role)}</span>
          ${ statusBadge(a.status) }
        </div>

        <div class="fleet-card__meta">
          <span class="fleet-card__model">${title}</span>
          ${ subtitle ? `<span class="fleet-card__mat">${subtitle}</span>` : '' }
        </div>

        <div class="fleet-card__extra">
          <span class="fleet-card__price">
            Precio base: ${priceLabel} créditos
          </span>

          ${ a.description ? `<p class="fleet-card__desc">${a.description}</p>` : '' }

          ${ purchasedPriceLabel ? `
            <span class="fleet-card__price">
              Comprado por: ${purchasedPriceLabel}
              ${a.purchasedAtLabel ? ` (el ${a.purchasedAtLabel})` : ''}
            </span>
          ` : '' }
        </div>
      </div>
    </article>
  `;
}

function roleLabel(role) {
    switch (role) {
        case 'commercial_passenger': return 'Pasajeros';
        case 'commercial_cargo':     return 'Carga';
        case 'military_transport':   return 'Transporte militar';
        case 'military_recon':       return 'Reconocimiento';
        case 'military_attack':      return 'Ataque';
        default: return role || '';
    }
}

function statusBadge(status) {
    const cls = status === 'on_mission'  ? 'status--mision' :
        status === 'maintenance' ? 'status--mantenimiento' :
            'status--aparcado';

    const text = status === 'on_mission'  ? 'En misión' :
        status === 'maintenance' ? 'En mantenimiento' :
            'Aparcado';

    return `<span class="badge badge--status ${cls}">${text}</span>`;
}

function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-ES');
}

async function loadBalance(el) {
    if (!el) return;
    try {
        const res = await fetch('/api/game/economy', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && typeof data.balance === 'number') {
            credits = data.balance;
            updateBalance(el);
        }
    } catch (err) {
        console.error('Error fetching balance:', err);
    }
}

function updateBalance(el) {
    if (!el) return;
    const value = typeof credits === 'number'
        ? credits.toLocaleString('es-ES')
        : '--';
    el.textContent = `Créditos: ${value}`;
}
