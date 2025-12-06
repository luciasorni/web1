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
    events: [
      { name: 'Halloween', description: 'misiones', boost: 20, start: '2025-10-25T00:00', end: '2025-11-02T23:59', status: 'active' },
      { name: 'Navidad',   description: 'recompensas', boost: 15, start: '2025-12-15T00:00', end: '2026-01-06T23:59', status: 'active' },
    ]
  };

  const api = {
    async getUsers() {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudieron cargar usuarios');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error usuarios');
      return data.users || [];
    },
    async createUser(payload) {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data.user;
    },
    async updateUser(id, payload) {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data.user;
    },
    async deleteUser(id) {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return true;
    },
    async getEvents() {
      const res = await fetch('/api/admin/events', { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudieron cargar eventos');
      const data = await res.json().catch(() => ({}));
      if (!data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data.events || [];
    },
    async createEvent(payload) {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data.event;
    },
    async updateEvent(id, payload) {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data.event;
    },
    async deleteEvent(id) {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return true;
    }
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

    let users = [];

    function render(filterText = '') {
      const q = filterText.trim().toLowerCase();
      tableBody.innerHTML = '';
      users
        .filter(u => {
          if (!q) return true;
          return (
            u.username.toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
          );
        })
        .forEach(u => {
          const status = u.isActive ? 'activo' : 'suspendido';
          const isAdmin = (u.roles || []).includes('admin');
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${u.username}</td>
            <td>${(u.roles || []).join(', ')}</td>
            <td>${status}</td>
            <td>${fmtDate(u.lastLoginAt)}</td>
            <td style="text-align:right;">
              <button class="admin-btn admin-btn--danger" data-action="suspend" data-id="${u.id}" ${(!u.isActive || isAdmin) ? 'disabled' : ''}>Suspender</button>
              <button class="admin-btn admin-btn--ok" data-action="restore" data-id="${u.id}" ${(u.isActive || isAdmin) ? 'disabled' : ''}>Restaurar</button>
              <button class="admin-btn admin-btn--danger" data-action="delete" data-id="${u.id}" ${isAdmin ? 'disabled' : ''}>Borrar</button>
            </td>
          `;
          tableBody.appendChild(tr);
        });
    }

    async function loadUsers() {
      try {
        users = await api.getUsers();
        render(searchInput?.value || '');
      } catch (err) {
        console.error(err);
        alert('No se pudieron cargar los usuarios.');
      }
    }

    function parseRoles(str) {
      const roles = (str || '').split(',').map(r => r.trim()).filter(Boolean);
      return roles.length ? roles : ['player'];
    }

    async function handleCreateOrUpdate() {
      const username = (userInput?.value || '').trim();
      const roles = parseRoles(roleInput?.value || 'player');
      if (!username) {
        alert('Introduce un usuario.');
        return;
      }

      const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      try {
        if (existing) {
          await api.updateUser(existing.id, { roles, isActive: true });
        } else {
          const suggestedEmail = `${username}@skyport.local`;
          const email = prompt('Email para el nuevo usuario', suggestedEmail);
          const password = prompt('Contraseña para el nuevo usuario (mín. 8 caracteres)', 'demo1234');
          if (!email || !password) {
            alert('Email y contraseña son obligatorios.');
            return;
          }
          await api.createUser({ username, email, password, roles });
        }
        if (userInput) userInput.value = '';
        if (roleInput) roleInput.value = '';
        await loadUsers();
      } catch (err) {
        console.error(err);
        alert('No se pudo guardar el usuario.');
      }
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

    tableBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const user = users.find(u => u.id === btn.dataset.id);
      if (!user) return;

      try {
        if (btn.dataset.action === 'suspend' && user.isActive) {
          await api.updateUser(user.id, { isActive: false });
        } else if (btn.dataset.action === 'restore' && !user.isActive) {
          await api.updateUser(user.id, { isActive: true });
        } else if (btn.dataset.action === 'delete') {
          if (confirm(`¿Borrar al usuario ${user.username}?`)) {
            await api.deleteUser(user.id);
          }
        }
        await loadUsers();
      } catch (err) {
        console.error(err);
        alert('No se pudo actualizar el usuario.');
      }
    });

    saveBtn?.addEventListener('click', handleCreateOrUpdate);

    loadUsers();
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

    let events = [];

    function renderEvents() {
      tableBody.innerHTML = '';
      events.forEach(ev => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${ev.name}</td>
          <td>${fmtRange(ev.startAt, ev.endAt)}</td>
          <td>+${ev.boostPercent}% ${ev.description || ''}</td>
          <td style="text-align:right;">
            <button class="admin-btn admin-btn--warn" data-action="toggle" data-id="${ev.id}">${ev.status === 'paused' ? 'Reanudar' : 'Pausar'}</button>
            <button class="admin-btn admin-btn--danger" data-action="delete" data-id="${ev.id}">Eliminar</button>
          </td>
        `; 
        tableBody.appendChild(tr);
      });
    }

    async function loadEvents() {
      try {
        events = await api.getEvents();
        renderEvents();
      } catch (err) {
        console.error(err);
        alert('No se pudieron cargar los eventos.');
      }
    }

    async function addEvent() {
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

      try {
        const existing = events.find(e => e.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          await api.updateEvent(existing.id, { name, description, boostPercent: boost, startAt: start, endAt: end, status: 'active' });
        } else {
          await api.createEvent({ name, description, boostPercent: boost, startAt: start, endAt: end, status: 'active' });
        }
        [nameInput, descInput, boostInput, startInput, endInput].forEach(i => { if (i) i.value = ''; });
        await loadEvents();
      } catch (err) {
        console.error(err);
        alert('No se pudo guardar el evento.');
      }
    }

    publishBtn?.addEventListener('click', addEvent);

    tableBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const ev = events.find(ev => ev.id === btn.dataset.id);
      if (!ev) return;

      try {
        if (btn.dataset.action === 'toggle') {
          const nextStatus = ev.status === 'paused' ? 'active' : 'paused';
          await api.updateEvent(ev.id, { status: nextStatus });
        } else if (btn.dataset.action === 'delete') {
          await api.deleteEvent(ev.id);
        }
        await loadEvents();
      } catch (err) {
        console.error(err);
        alert('No se pudo actualizar el evento.');
      }
    });

    loadEvents();
  }
})();
