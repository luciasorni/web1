// /public/js/economy.js
// Nueva versión: lee los datos reales del servidor, no del localStorage.

document.addEventListener('DOMContentLoaded', () => {

    const els = {
        balanceDisplay: document.getElementById('balance-display'),
        // balanceDelta:   document.getElementById('balance-delta'),
        // netBalance:     document.getElementById('net-balance'),

        expensesList:   document.getElementById('expenses-list'),
        incomeList:     document.getElementById('income-list'),

        totalExpenses:  document.getElementById('total-expenses'),
        totalIncome:    document.getElementById('total-income'),

        rangeSelect:    document.getElementById('eco-range'),

        addExpenseBtn:  document.getElementById('add-expense'),
        addIncomeBtn:   document.getElementById('add-income'),
        addMovement:    document.getElementById('eco-add-movement'),
    };

    const nf = new Intl.NumberFormat('es-ES', {
        style: 'currency', currency: 'EUR', maximumFractionDigits: 0
    });

    const formatMoney = n => nf.format(n);

    // Clasifica tipo real → income / expense
    const normalizeType = (t, amount) => {
        const low = (t || '').toLowerCase();
        const incomeHints = ['reward', 'credit', 'sell', 'sale', 'refund', 'income'];
        const expenseHints = ['purchase', 'activate', 'cost', 'fee', 'fuel', 'buy', 'maintenance'];

        if (incomeHints.some(h => low.includes(h))) return 'income';
        if (expenseHints.some(h => low.includes(h))) return 'expense';

        if (typeof amount === 'number' && !Number.isNaN(amount)) {
            return amount > 0 ? 'income' : 'expense';
        }

        return 'expense';
    };

    function renderMovement(list, mov) {
        const li = document.createElement('li');
        li.className = `economy-page__item economy-page__item--${mov.type}`;
        li.dataset.amount = mov.amount;

        li.innerHTML = `
            <span>${mov.description || mov.type}</span>
            <span class="economy-page__amount-badge">
                ${mov.type === 'income' ? '+' : '-'}${formatMoney(Math.abs(mov.amount))}
            </span>
        `;

        list.appendChild(li);
    }

    async function loadEconomy() {
        try {
            const res = await fetch('/api/game/economy', {
                method: 'GET',
                credentials: 'same-origin'
            });

            const data = await res.json();

            if (!data.ok) {
                console.error('Economy API returned non ok:', data);
                return;
            }

            // 1) Mostrar saldo
            els.balanceDisplay.textContent = formatMoney(data.balance);

            // 2) Pintar movimientos reales
            els.expensesList.innerHTML = '';
            els.incomeList.innerHTML = '';

            data.movements.forEach(m => {
                const type = normalizeType(m.type, m.amount);
                m.type = type;

                if (type === 'expense') {
                    renderMovement(els.expensesList, m);
                } else {
                    renderMovement(els.incomeList, m);
                }
            });

            updateTotals();

        } catch (err) {
            console.error('Error loading economy:', err);
        }
    }

    function sumList(ul) {
        return [...ul.querySelectorAll('li')]
            .reduce((acc, el) => acc + Number(el.dataset.amount), 0);
    }

    function updateTotals() {
        const totalExp = sumList(els.expensesList); // suma de amounts de gastos (NEGATIVOS)
        const totalInc = sumList(els.incomeList);   // suma de amounts de ingresos (POSITIVOS)

        // Pintamos solo los totales de cada columna
        if (els.totalExpenses) {
            els.totalExpenses.textContent = `- ${formatMoney(Math.abs(totalExp))}`;
        }

        if (els.totalIncome) {
            els.totalIncome.textContent = `+ ${formatMoney(Math.abs(totalInc))}`;
        }

        // Si quisieras seguir calculando el neto internamente (para logs, etc.),
        // sería así (pero ya no se pinta en ningún sitio):
        //
        // const net = totalInc + totalExp; // ingresos + gastos(con signo)
    }

    // ▼ Inicializar página
    loadEconomy();
});
