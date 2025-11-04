// Simulación de datos hasta tener la BBDD
const FLEET_DATA = [
  {
    id: 1,
    nombre: 'C-27 Spartan',
    tipo: 'transporte',      // militar | personas | transporte | servicios
    matricula: 'EC-TRN-001',
    capacidad: 68,
    status: 'mision',        // mision | mantenimiento | aparcado
    imagen: 'avion1.png'
  },
  {
    id: 2,
    nombre: 'A320 Neo',
    tipo: 'personas',
    matricula: 'EC-PAX-320',
    capacidad: 186,
    status: 'aparcado',
    imagen: 'avion2.png'
  },
  {
    id: 3,
    nombre: 'UH-60 Black Hawk',
    tipo: 'servicios',
    matricula: 'EC-SRV-060',
    capacidad: 11,
    status: 'mantenimiento',
    imagen: 'avion3.png'
  },
  {
    id: 4,
    nombre: 'Eurofighter Typhoon',
    tipo: 'militar',
    matricula: 'EC-MIL-200',
    capacidad: 1,
    status: 'mision',
    imagen: 'avion4.png'
  }
];

// Utilidades
const imgPath = (file) => `../../public/img/${file}`;
const ucFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

function renderFleet(list) {
  const grid = document.getElementById('fleet-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!list || !list.length) {
    grid.innerHTML = `<div class="placeholder-text">No hay resultados.</div>`;
    return;
  }

  list.forEach(av => {
    const card = document.createElement('article');
    card.className = 'fleet-card';
    card.tabIndex = 0; // accesible

    card.innerHTML = `
      <div class="fleet-card__ribbon fleet-card__ribbon--${av.status}">
        ${av.status === 'mision' ? 'En misión' : av.status === 'mantenimiento' ? 'Mantenimiento' : 'Aparcado'}
      </div>

      <div class="fleet-card__img-wrap">
        <img class="fleet-card__img" src="${imgPath(av.imagen)}" alt="${av.nombre}">
      </div>

      <div class="fleet-card__body">
        <h3 class="fleet-card__name">${av.nombre}</h3>
        <p class="fleet-card__mat">Matrícula: <strong>${av.matricula}</strong></p>

        <div class="fleet-card__meta-grid">
          <div class="fleet-card__meta-item">
            <span class="fleet-card__meta-label">Tipo</span>
            <span class="fleet-card__meta-value">${ucFirst(av.tipo)}</span>
          </div>
          <div class="fleet-card__meta-item">
            <span class="fleet-card__meta-label">Capacidad</span>
            <span class="fleet-card__meta-value">${av.capacidad} pax</span>
          </div>
        </div>
      </div>
    `;

    // (opcional) selección visual al hacer click
    card.addEventListener('click', () => {
      card.classList.toggle('is-selected');
    });

    grid.appendChild(card);
  });
}

function applyFilters() {
  const t = document.getElementById('filtro-tipo').value;
  const s = document.getElementById('filtro-status').value;
  const m = document.getElementById('filtro-matricula').value.trim().toLowerCase();

  let filtered = FLEET_DATA.slice();

  if (t !== 'todos') filtered = filtered.filter(x => x.tipo === t);
  if (s !== 'todos') filtered = filtered.filter(x => x.status === s);
  if (m) filtered = filtered.filter(x => x.matricula.toLowerCase().includes(m));

  renderFleet(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
  // primer render
  renderFleet(FLEET_DATA);

  // eventos filtros
  document.getElementById('btn-filtrar')?.addEventListener('click', applyFilters);
  document.getElementById('btn-limpiar')?.addEventListener('click', () => {
    document.getElementById('filtro-tipo').value = 'todos';
    document.getElementById('filtro-status').value = 'todos';
    document.getElementById('filtro-matricula').value = '';
    renderFleet(FLEET_DATA);
  });
});
