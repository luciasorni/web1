// /public/js/admin.js
// Lógica cliente para los paneles de administración (users/events) sin depender de backend real.

(function () {
  const STORAGE = {
    read(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (err) {
        console.warn('No se pudo leer de localStorage', err);
        return fallback;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.warn('No se pudo guardar en localStorage', err);
      }
    }
  };

  const seeds = {
    users: [
      { username: 'lucia',    role: 'admin', status: 'activo', lastAccess: '2025-11-02T12:35:00Z' },
      { username: 'juan6969', role: 'player', status: 'activo', lastAccess: '2025-11-02T11:10:00Z' },
    ],
    events: [
      { name: 'Halloween', description: 'misiones', boost: 20, start: '2025-10-25T00:00', end: '2025-11-02T23:59', status: 'active' },
      { name: 'Navidad',   description: 'recompensas', boost: 15, start: '2025-12-15T00:00', end: '2026-01-06T23:59', status: 'active' },
    ]
  };

  const fmtDate = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d)) return v || '';
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const fmtRange = (start, end) => `${fmtDate(start)} → ${fmtDate(end)}`;

  document.addEventListener('DOMContentLoaded', () => {
    const isUsersPage  = Boolean(document.querySelector('input[placeholder="Buscar usuario..."]'));
    const isEventsPage = Boolean(document.querySelector('input[placeholder="Nombre del evento"]'));

    if (isUsersPage) initUsersPage();
    if (isEventsPage) initEventsPage();
  });

  // ---- USERS PAGE ----
  function initUsersPage() {
    const searchInput = document.querySelector('input[placeholder="Buscar usuario..."]');
    const cards       = document.querySelectorAll('.admin-card');
    const searchCard  = cards[0];
    const formCard    = cards[1];
    const searchBtn   = searchCard?.querySelector('.admin-btn--primary');
    const clearBtn    = searchCard?.querySelector('.admin-btn--warn');
    const tableBody   = document.querySelector('.admin-table tbody');
    const userInput   = formCard?.querySelector('input[placeholder="Usuario"]');
    const roleInput   = formCard?.querySelector('input[placeholder="Rol (player/admin)"]');
    const saveBtn     = formCard?.querySelector('.admin-btn--primary');

    if (!tableBody) return;

    let users = STORAGE.read('admin_users', null) || seeds.users.slice();

    const saveUsers = () => STORAGE.write('admin_users', users);

    function render(filterText = '') {
      const q = filterText.trim().toLowerCase();
      tableBody.innerHTML = '';
      users
        .filter(u => !q || u.username.toLowerCase().includes(q))
        .forEach(u => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${u.username}</td>
            <td>${u.role}</td>
            <td>${u.status}</td>
            <td>${fmtDate(u.lastAccess)}</td>
            <td style="text-align:right;">
              <button class="admin-btn admin-btn--danger" data-action="suspend" data-user="${u.username}" ${u.status !== 'activo' ? 'disabled' : ''}>Suspender</button>
              <button class="admin-btn admin-btn--ok" data-action="restore" data-user="${u.username}" ${u.status === 'activo' ? 'disabled' : ''}>Restaurar</button>
            </td>
          `;
          tableBody.appendChild(tr);
        });
    }

    function upsertUser(username, role) {
      const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existing) {
        existing.role = role;
        existing.status = 'activo';
      } else {
        users.push({
          username,
          role,
          status: 'activo',
          lastAccess: new Date().toISOString()
        });
      }
      saveUsers();
      render(searchInput?.value || '');
    }

    searchBtn?.addEventListener('click', () => render(searchInput?.value || ''));
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        render(searchInput.value);
      }
    });
    clearBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      render();
    });

    tableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const user = users.find(u => u.username === btn.dataset.user);
      if (!user) return;

      if (btn.dataset.action === 'suspend' && user.status === 'activo') {
        user.status = 'suspendido';
      } else if (btn.dataset.action === 'restore') {
        user.status = 'activo';
        user.lastAccess = new Date().toISOString();
      }
      saveUsers();
      render(searchInput?.value || '');
    });

    saveBtn?.addEventListener('click', () => {
      const username = (userInput?.value || '').trim();
      const role = (roleInput?.value || '').trim() || 'player';
      if (!username) {
        alert('Introduce un usuario.');
        return;
      }
      upsertUser(username, role);
      if (userInput) userInput.value = '';
      if (roleInput) roleInput.value = '';
    });

    render();
  }

  // ---- EVENTS PAGE ----
  function initEventsPage() {
    const nameInput = document.querySelector('input[placeholder="Nombre del evento"]');
    const descInput = document.querySelector('input[placeholder="Descripción"]');
    const boostInput= document.querySelector('input[placeholder="Boost % recompensa (ej. 15)"]');
    const dateInputs= Array.from(document.querySelectorAll('input[type="datetime-local"]'));
    const startInput= dateInputs[0];
    const endInput  = dateInputs[1];
    const publishBtn= document.querySelector('.admin-card .admin-btn--primary');
    const tableBody = document.querySelector('.admin-table tbody');

    if (!tableBody) return;

    let events = STORAGE.read('admin_events', null) || seeds.events.slice();
    const saveEvents = () => STORAGE.write('admin_events', events);

    function renderEvents() {
      tableBody.innerHTML = '';
      events.forEach(ev => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${ev.name}</td>
          <td>${fmtRange(ev.start, ev.end)}</td>
          <td>+${ev.boost}% ${ev.description || ''}</td>
          <td style="text-align:right;">
            <button class="admin-btn admin-btn--warn" data-action="toggle" data-name="${ev.name}">${ev.status === 'paused' ? 'Reanudar' : 'Pausar'}</button>
            <button class="admin-btn admin-btn--danger" data-action="delete" data-name="${ev.name}">Eliminar</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }

    function addEvent() {
      const name = (nameInput?.value || '').trim();
      const description = (descInput?.value || '').trim();
      const boost = Number(boostInput?.value || 0);
      const start = startInput?.value;
      const end   = endInput?.value;

      if (!name || !start || !end) {
        alert('Nombre, inicio y fin son obligatorios.');
        return;
      }
      if (boostInput && boostInput.value && Number.isNaN(boost)) {
        alert('Boost inválido.');
        return;
      }

      const existing = events.find(e => e.name.toLowerCase() === name.toLowerCase());
      const payload = { name, description, boost, start, end, status: 'active' };
      if (existing) {
        Object.assign(existing, payload);
      } else {
        events.push(payload);
      }
      saveEvents();
      renderEvents();
      [nameInput, descInput, boostInput, startInput, endInput].forEach(i => { if (i) i.value = ''; });
    }

    publishBtn?.addEventListener('click', addEvent);

    tableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const ev = events.find(ev => ev.name === btn.dataset.name);
      if (!ev) return;

      if (btn.dataset.action === 'toggle') {
        ev.status = ev.status === 'paused' ? 'active' : 'paused';
      } else if (btn.dataset.action === 'delete') {
        events = events.filter(e => e.name !== ev.name);
      }
      saveEvents();
      renderEvents();
    });

    renderEvents();
  }
})();
