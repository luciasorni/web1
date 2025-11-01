// public/js/economy.js

document.addEventListener('DOMContentLoaded', () => {
  // Elemento donde mostramos el saldo
  const balanceEl = document.getElementById('balance-display');
  if (!balanceEl) return; // por si alguien carga el JS en otra página

  // --- helpers de formateo ---
  const parseBalance = (txt) =>
    Number(txt.replace(/\./g, '').replace(',', '.')) || 0;

  const formatBalance = (num) =>
    num.toLocaleString('es-ES');

  // saldo inicial leído del HTML
  let balance = parseBalance(balanceEl.textContent);

  // ====== GASTOS ======
  const expenseItems = document.querySelectorAll(
    '.economy-page__item--expense'
  );

  expenseItems.forEach((item) => {
    item.addEventListener('click', () => {
      const amount = Number(item.dataset.amount || 0);
      balance = balance - amount;
      if (balance < 0) balance = 0;
      balanceEl.textContent = formatBalance(balance);
      paintBadge(item, `- ${amount.toLocaleString('es-ES')}`);
    });
  });

  // ====== INGRESOS ======
  const incomeItems = document.querySelectorAll(
    '.economy-page__item--income'
  );

  incomeItems.forEach((item) => {
    item.addEventListener('click', () => {
      const amount = Number(item.dataset.amount || 0);
      balance = balance + amount;
      balanceEl.textContent = formatBalance(balance);
      paintBadge(item, `+ ${amount.toLocaleString('es-ES')}`);
    });
  });

  // ====== util para crear / actualizar la pill ======
  function paintBadge(li, text) {
    let badge = li.querySelector('.economy-page__amount-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'economy-page__amount-badge';
      li.appendChild(badge);
    }
    badge.textContent = text;
  }
});
