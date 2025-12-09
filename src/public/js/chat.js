// /public/js/chat.js
// Chat global en tiempo real (no persistente) con Socket.IO

document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const stream = $('chatStream');
    const form   = $('chatForm');
    const input  = $('chatText');

    const socket = io({
        autoConnect: true,
        withCredentials: true,
    });

    const state = {
        userId: null,
        userName: 'Yo',
    };

    const hhmm = (ts) => {
        const d = ts ? new Date(ts) : new Date();
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const addMsg = ({ text, userId, userName, ts }) => {
        const mine = state.userId && userId === state.userId;
        const wrap = document.createElement('div');
        wrap.className = 'msg ' + (mine ? 'msg--me' : 'msg--other');
        wrap.innerHTML = `
            <div class="msg__bubble">
                <div class="msg__author"></div>
                <div class="msg__text"></div>
                <div class="msg__time"></div>
            </div>
        `;

        wrap.querySelector('.msg__author').textContent = mine ? 'Tú' : (userName || 'Jugador');
        wrap.querySelector('.msg__text').textContent = text;
        wrap.querySelector('.msg__time').textContent = hhmm(ts);
        stream.appendChild(wrap);
        stream.scrollTop = stream.scrollHeight;
    };

    const addSystem = (text) => {
        const wrap = document.createElement('div');
        wrap.className = 'msg msg--other';
        wrap.innerHTML = `
            <div class="msg__bubble">
                <div class="msg__author">Sistema</div>
                <div class="msg__text"></div>
                <div class="msg__time">${hhmm()}</div>
            </div>
        `;
        wrap.querySelector('.msg__text').textContent = text;
        stream.appendChild(wrap);
        stream.scrollTop = stream.scrollHeight;
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = (input.value || '').trim();
        if (!text) return;
        socket.emit('chat:message', { text });
        input.value = '';
    });

    socket.on('chat:ready', ({ userId, userName }) => {
        state.userId = userId;
        state.userName = userName || 'Yo';
        addSystem(`Conectado como ${state.userName}`);
    });

    socket.on('chat:message', (msg) => {
        if (!msg || typeof msg.text !== 'string') return;
        addMsg(msg);
        if (/\bavion\b/i.test(msg.text)) spawnBigPlane();
        if (/arcoiris/i.test(msg.text)) triggerTrippyMode();
    });

    socket.on('connect_error', (err) => {
        addSystem(err?.message === 'unauthorized'
            ? 'Sesión no válida. Vuelve a iniciar sesión.'
            : 'No se pudo conectar con el chat.'
        );
    });
});

// Easter egg: si un mensaje contiene "avion", aparece un avión grande volando
function spawnBigPlane() {
    const scene = document.body;
    const plane = document.createElement('div');
    plane.className = 'chat-easter-plane';
    plane.textContent = '✈️';
    plane.style.left = `${-200}px`;
    plane.style.top = `${Math.random() * 60 + 10}%`;
    scene.appendChild(plane);

    const duration = 5000 + Math.random() * 2000;
    plane.animate([
        { transform: 'translate(0,0) rotate(10deg) scale(1.2)', opacity: 1 },
        { transform: 'translate(120vw, -30vh) rotate(20deg) scale(1.6)', opacity: 0 }
    ], {
        duration,
        easing: 'ease-in-out',
        fill: 'forwards'
    }).onfinish = () => plane.remove();
}

// Easter egg: mensaje con "arcoiris" activa modo arcoíris
let trippyTimer = null;
function triggerTrippyMode() {
    clearTimeout(trippyTimer);
    document.body.classList.add('trippy-mode');
    trippyTimer = setTimeout(() => {
        document.body.classList.remove('trippy-mode');
    }, 12000);
}
