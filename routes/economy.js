// ==== Utilidades ====
const fmt = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0
});
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const getAmount = el => Number(el.getAttribute('data-amount') || '0');
const setBadge = (li) => {
  if (li.querySelector('.economy-page__amount-badge')) return;
  const amount = getAmount(li);
  const isInc = li.classList.contains('economy-page__item--income');
  const badge = document.createElement('span');
  badge.className = 'economy-page__amount-badge';
  badge.textContent = `${isInc ? '+' : '−'} ${fmt.format(amount)}`;
  li.appendChild(badge);
};
const setActions = (li) => {
  if (li.querySelector('.item-actions')) return;
  const actions = document.createElement('span');
  actions.className = 'item-actions';
  actions.innerHTML = `
    <button class="icon-btn" data-act="edit" title="Editar">✎</button>
    <button class="icon-btn" data-act="del"  title="Borrar">🗑</button>
  `;
  li.appendChild(actions);
};

// ==== Inicialización visual ====
function beautifyRows() {
  $$('.economy-page__item').forEach(li => { setBadge(li); setActions(li); });
}

function ensureBalanceFormat() {
  const el = $('#balance-display');
  if (!el) return;
  const raw = Number(el.textContent.replace(/[^\d.-]+/g, ''));
  if (!Number.isNaN(raw)) el.textContent = fmt.format(raw);
}

// ==== Cálculos ====
function totals() {
  const ex = $$('.economy-page__item--expense').reduce((a, li) => a + getAmount(li), 0);
  const inc = $$('.economy-page__item--income').reduce((a, li) => a + getAmount(li), 0);
  const net = inc - ex;

  $('#total-expenses').textContent = `− ${fmt.format(ex)}`;
  $('#total-income').textContent = `+ ${fmt.format(inc)}`;
  const nb = $('#net-balance');
  nb.textContent = `${net >= 0 ? '+' : '−'} ${fmt.format(Math.abs(net))}`;
  nb.className = `pill ${net >= 0 ? 'pill--pos' : 'pill--neg'}`;

  // Delta al lado del Saldo (no tocamos el saldo base)
  const delta = $('#balance-delta');
  delta.textContent = `${net >= 0 ? '+' : '−'} ${fmt.format(Math.abs(net))}`;
}

function refresh() {
  // limpiar badges duplicados
  $$('.economy-page__amount-badge').forEach(b => b.remove());
  beautifyRows();
  totals();
}

// ==== Alta / edición / borrado ====
function addMovement({ type }) {
  const name = prompt(`Concepto del ${type === 'income' ? 'ingreso' : 'gasto'}:`);
  if (!name) return;

  const valStr = prompt('Importe en euros (número):');
  const val = Number(valStr?.replace(',', '.'));
  if (!Number.isFinite(val) || val <= 0) return alert('Importe no válido');

  const li = document.createElement('li');
  li.className = `economy-page__item economy-page__item--${type}`;
  li.setAttribute('data-amount', String(Math.round(val)));
  li.textContent = name;

  const ul = type === 'income' ? $('#income-list') : $('#expenses-list');
  ul.appendChild(li);

  setBadge(li); setActions(li); totals();
}

function handleItemClick(e) {
  const btn = e.target.closest('.icon-btn');
  if (!btn) return;
  const li = e.target.closest('.economy-page__item');
  if (!li) return;

  const act = btn.getAttribute('data-act');
  if (act === 'del') {
    li.remove(); totals(); return;
  }
  if (act === 'edit') {
    const currentName = li.childNodes[0].nodeValue.trim();
    const newName = prompt('Nuevo concepto:', currentName) ?? currentName;
    const currentAmt = getAmount(li);
    const newAmtStr = prompt('Nuevo importe (€):', String(currentAmt));
    const newAmt = Number((newAmtStr || '').replace(',', '.'));
    if (Number.isFinite(newAmt) && newAmt > 0) {
      li.setAttribute('data-amount', String(Math.round(newAmt)));
    }
    li.childNodes[0].nodeValue = newName + ' ';
    refresh();
  }
}

// ==== Botón "Añadir movimiento" (elige columna) ====
function quickAdd() {
  const opts = ['Ingreso', 'Gasto'];
  const pick = prompt('Tipo de movimiento: Ingreso / Gasto').toLowerCase();
  if (pick.startsWith('i')) return addMovement({ type: 'income' });
  if (pick.startsWith('g')) return addMovement({ type: 'expense' });
}

// ==== Ready ====
document.addEventListener('DOMContentLoaded', () => {
  ensureBalanceFormat();
  beautifyRows();
  totals();

  // acciones en listas
  $('#expenses-list').addEventListener('click', handleItemClick);
  $('#income-list').addEventListener('click', handleItemClick);

  // botones de añadir
  $('#add-expense').addEventListener('click', () => addMovement({ type: 'expense' }));
  $('#add-income').addEventListener('click', () => addMovement({ type: 'income' }));
  $('#eco-add-movement').addEventListener('click', quickAdd);
});
