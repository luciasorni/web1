const DB = {
  friends: [
    { id: 1, name: 'Jesús', online: true,  lastSeen: 'ahora' },
    { id: 2, name: 'Inés',  online: false, lastSeen: 'hace 1 h' },
    { id: 3, name: 'Juan',  online: true,  lastSeen: 'hace 2 min' },
    { id: 4, name: 'Lucía', online: false, lastSeen: 'ayer' },
  ],
  requests: [],
  searchPool: ['Jesús','Inés','Juan','Lucía','Sofía','Laura','Pepe','Mario','Ana','Nuria']
};

const $  = (s, r=document)=>r.querySelector(s);

// ===== RENDER GENERAL =====
function renderAll(){
  renderStats();
  renderRequests();
  renderFriends();
}

// ===== ESTADÍSTICAS =====
function renderStats(){
  $('#stat-friends').textContent = DB.friends.length;
  $('#stat-online').textContent  = DB.friends.filter(f=>f.online).length;
  $('#stat-requests').textContent = DB.requests.length;
}

// ===== SOLICITUDES =====
function renderRequests(){
  const box = $('#requests-list');
  if(DB.requests.length === 0){
    box.classList.add('empty-box');
    box.textContent = 'No tienes solicitudes pendientes.';
    return;
  }
}

// ===== AMIGOS =====
function renderFriends(){
  const grid = $('#friends-list');
  grid.innerHTML = '';
  if(DB.friends.length === 0){
    grid.innerHTML = `<div class="empty-box">Aún no tienes amigos aquí.</div>`;
    return;
  }
  DB.friends.forEach(f=>{
    const card = document.createElement('div');
    card.className = 'friend-card';
    card.innerHTML = `
      <div class="friend-top">
        <div class="friend-name">
          <span class="dot ${f.online ? 'dot--on':'dot--off'}"></span>
          ${f.name}
        </div>
        <div class="friend-meta">${f.online ? 'En línea' : `Visto ${f.lastSeen}`}</div>
      </div>
      <div class="friend-actions">
        <button class="small-btn" data-visit="${f.id}">Visitar aeropuerto</button>
        <button class="small-btn small-btn--secondary" data-loan="${f.id}">Prestar avión</button>
        <button class="small-btn small-btn--ghost" data-msg="${f.id}">Mensajes</button>
      </div>`;
    grid.appendChild(card);
  });

  grid.onclick = (e)=>{
    const visit = e.target.closest('[data-visit]');
    const loan  = e.target.closest('[data-loan]');
    const msg   = e.target.closest('[data-msg]');
    if(visit){
      const f = DB.friends.find(x=>x.id == visit.dataset.visit);
      alert(`Visitando aeropuerto de ${f.name}`);
    } else if(loan){
      const f = DB.friends.find(x=>x.id == loan.dataset.loan);
      alert(`Prestando avión a ${f.name}`);
    } else if(msg){
      const f = DB.friends.find(x=>x.id == msg.dataset.msg);
      window.location.href = `../chat/chat.html?to=${encodeURIComponent(f.name)}`;
    }
  };
}

// ===== BUSCADOR =====
function setupSearch(){
  $('#btn-search').onclick = ()=>{
    const term = $('#search-user').value.toLowerCase();
    const results = DB.searchPool.filter(n => n.toLowerCase().includes(term));
    const box = $('#search-results');
    if(!term || !results.length){ box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = results.map(r=>`
      <div class="result-row">
        <span class="result-name">${r}</span>
        <button class="chip chip--ok" data-add="${r}">Añadir</button>
      </div>
    `).join('');
    box.onclick = e=>{
      const add = e.target.closest('[data-add]');
      if(add){
        alert(`Has enviado solicitud a ${add.dataset.add}`);
        box.hidden = true;
      }
    };
  };
}

// ===== ACCIONES RÁPIDAS =====
function setupQuickActions(){
  $('#btn-invite-code').onclick = ()=>{
    const code = Math.random().toString(36).slice(2,8).toUpperCase();
    alert(`Tu código de invitación: ${code}`);
  };
  $('#btn-copy-link').onclick = ()=>{
    navigator.clipboard.writeText('https://skyport.example/invite/ABC123');
    alert('Enlace copiado');
  };
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', ()=>{
  setupQuickActions();
  setupSearch();
  renderAll();
});
