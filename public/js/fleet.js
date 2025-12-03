// public/js/fleet.js

let owned = [];
let catalog = [];
let currentFilter = 'all';

// --- Carga inicial de la página ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Fleet.js DOMContentLoaded');

    const gridOwned   = document.getElementById('fleetOwnedGrid');
    const gridCatalog = document.getElementById('fleetCatalogGrid');
    const filters     = document.getElementById('filters');

    if (!gridOwned || !gridCatalog || !filters) {
        console.error('Fleet: missing DOM elements');
        return;
    }

    try {
        const res = await fetch('/api/game/fleet', {
            credentials: 'same-origin'
        });

        if (!res.ok) {
            console.error('Fleet API error:', res.status);
            return;
        }

        const data = await res.json();
        if (!data.ok) {
            console.error('Fleet API responded not-ok:', data);
            return;
        }

        // Mensaje para confirmar que la recuperación de la información ha ido bien
        console.log('Fleet data loaded:', data);

        // --- Flota del usuario ---
        owned = data.fleet.map(a => ({
            id: a.id,
            typeId: a.typeId,
            role: a.role,
            status: a.status,
            matricula: a.nickname || a.id,
            model: a.model,
            description: a.description,
            basePrice: Number(a.basePrice) || 0,
            purchasedPrice: a.purchasedPrice != null ? Number(a.purchasedPrice) : null,
            purchasedAtLabel: formatDate(a.purchasedAt),
            imageUrl: `/img/aircraft/${a.typeId}.jpeg`
        }));

        // --- Contador: cuántos aviones tengo de cada tipo ---
        const countByTypeId = owned.reduce((acc, a) => {
            acc[a.typeId] = (acc[a.typeId] || 0) + 1;
            return acc;
        }, {});

        // --- Catálogo completo ---
        catalog = data.catalog.map(t => ({
            id: t.id,
            role: t.role,
            model: t.model,
            description: t.description,
            basePrice: Number(t.basePrice) || 0,
            imageUrl: `/img/aircraft/${t.id}.jpeg`,
            ownedCount: countByTypeId[t.id] || 0
        }));

        // Primer pintado
        applyFilter();

        // --- Filtros ---
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

// --- Listener global para el botón Comprar ---
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.fleet-btn--buy');
    if (!btn) return;

    const typeId = btn.dataset.typeId; // string (p.ej. "C130")
    console.log('Click en botón comprar, typeId =', typeId);

    const type = catalog.find(c => c.id === typeId);
    if (!type) {
        console.warn('Tipo no encontrado en catálogo para id', typeId, 'catalog:', catalog);
        return;
    }

    const originalText = btn.textContent;
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
        console.log('Respuesta /fleet/buy:', res.status, data);

        if (!res.ok || !data.ok) {
            console.error('Compra no aceptada por el backend:', res.status, data);

            if (data.error === 'insufficient_credits') {
                alert('No tienes créditos suficientes para comprar este avión.');
            } else if (data.error === 'type_not_found') {
                alert('Este tipo de avión no existe.');
            } else if (data.error === 'user_not_found') {
                alert('Usuario no encontrado.');
            } else {
                alert('No se ha podido completar la compra. Inténtalo más tarde.');
            }
            return;
        }

        if (!data.aircraft) {
            console.error('Respuesta sin "aircraft" aunque ok=true:', data);
            alert('El servidor no ha devuelto datos del avión comprado.');
            return;
        }

        // --- Compra OK ---
        const a = data.aircraft;

        owned.push({
            id: a.id,
            typeId: a.typeId,
            role: a.role,
            status: a.status,
            matricula: a.nickname || a.id,
            model: a.model,
            description: a.description,
            basePrice: Number(a.basePrice) || 0,
            purchasedPrice: a.purchasedPrice != null ? Number(a.purchasedPrice) : null,
            purchasedAtLabel: formatDate(a.purchasedAt),
            imageUrl: `/img/aircraft/${a.typeId}.jpeg`
        });

        const entry = catalog.find(c => c.id === a.typeId);
        if (entry) {
            entry.ownedCount = (entry.ownedCount || 0) + 1;
        }

        console.log('Créditos restantes tras compra:', data.credits);

        applyFilter(); // repinta flota + catálogo

    } catch (err) {
        console.error('Error realizando la compra:', err);
        alert('Error de comunicación con el servidor al comprar el avión.');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

// --- Helpers de filtrado y render ---

function applyFilter() {
    const gridOwned   = document.getElementById('fleetOwnedGrid');
    const gridCatalog = document.getElementById('fleetCatalogGrid');

    if (!gridOwned || !gridCatalog) return;

    if (currentFilter === 'all') {
        renderOwned(gridOwned, owned);
        renderCatalog(gridCatalog, catalog);
    } else {
        renderOwned(
            gridOwned,
            owned.filter(a => a.role === currentFilter)
        );
        renderCatalog(
            gridCatalog,
            catalog.filter(c => c.role === currentFilter)
        );
    }
}

function renderOwned(gridOwned, list) {
    gridOwned.innerHTML = list.map(a => card(a, true)).join('');
}

function renderCatalog(gridCatalog, list) {
    gridCatalog.innerHTML = list.map(a => card(a, false)).join('');
}

function card(a, isOwned) {
    const priceLabel = typeof a.basePrice === 'number'
        ? a.basePrice.toLocaleString('es-ES')
        : (a.basePrice ?? 'N/D');

    const purchasedPriceLabel = (typeof a.purchasedPrice === 'number')
        ? a.purchasedPrice.toLocaleString('es-ES')
        : a.purchasedPrice;

    return `
    <article class="fleet-card">
      <div class="fleet-card__img">
        <img src="${a.imageUrl}" alt="${a.model}" class="fleet-card__img-tag" />
      </div>

      <div class="fleet-card__body">

        <div class="fleet-card__top">
          <span class="badge badge--type">${roleLabel(a.role)}</span>
          ${ isOwned ? statusBadge(a.status) : '' }
        </div>

        <div class="fleet-card__meta">
          <span class="fleet-card__mat">
            ${ isOwned ? a.matricula : a.model }
          </span>
        </div>

        <div class="fleet-card__extra">
          <span class="fleet-card__price">
            Precio base: ${priceLabel} créditos
          </span>

          ${ a.description ? `<p class="fleet-card__desc">${a.description}</p>` : '' }

          ${ !isOwned && typeof a.ownedCount === 'number' ? `
            <span class="fleet-card__owned-count">
              Tienes ${a.ownedCount} de este modelo
            </span>
          ` : '' }

          ${ isOwned && purchasedPriceLabel ? `
            <span class="fleet-card__price">
              Comprado por: ${purchasedPriceLabel}
              ${a.purchasedAtLabel ? ` (el ${a.purchasedAtLabel})` : ''}
            </span>
          ` : '' }

          <div class="fleet-card__actions">
            ${ !isOwned ? `
              <button class="fleet-btn fleet-btn--buy"
                      data-type-id="${a.id}">
                Comprar
              </button>
            ` : '' }
          </div>
        </div>
      </div>
    </article>
  `;
}

// --- Helpers varios ---

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
