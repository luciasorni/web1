document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("ryanairChart");
  if (!canvas || typeof Chart === "undefined") return;

  const ctx = canvas.getContext("2d");
  const API_PATH = "/api/stocks/crypto/bitcoin?currency=eur"; // cripto = 24/7 (no "bolsa cerrada")
  const MAX_POINTS = 30;

  const badgeEl = document.getElementById("liveBadge");
  const priceEl = document.getElementById("livePrice");
  const updatedEl = document.getElementById("liveUpdated");

  let lastPrice = null;
  const priceData = [];
  const timeLabels = [];

  const ryanairChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: timeLabels,
      datasets: [{
        label: "Precio Bitcoin (EUR)",
        data: priceData,
        borderWidth: 2,
        fill: true,
        tension: 0.25,
        segment: {
          borderColor: ctx => {
            const p0 = ctx.p0.parsed.y;
            const p1 = ctx.p1.parsed.y;
            return p1 >= p0 ? "rgba(0, 200, 0, 1)" : "rgba(200, 0, 0, 1)";
          },
          backgroundColor: ctx => {
            const p0 = ctx.p0.parsed.y;
            const p1 = ctx.p1.parsed.y;
            return p1 >= p0 ? "rgba(0, 200, 0, 0.15)" : "rgba(200, 0, 0, 0.15)";
          }
        }
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: "rgba(0,0,0,0.05)" },
          ticks: { callback: v => `€${v}` }
        },
        x: { grid: { display: false } }
      }
    }
  });

  const updateBadge = (mode, price, at) => {
    if (!badgeEl) return;

    const classMap = {
      connecting: "live-badge live-badge--connecting",
      live: "live-badge live-badge--live",
      cache: "live-badge live-badge--cache",
      stale: "live-badge live-badge--stale",
      error: "live-badge live-badge--error"
    };
    const textMap = {
      connecting: "Conectando…",
      live: "En vivo",
      cache: "Cache reciente",
      stale: "Dato anterior",
      error: "Sin conexión"
    };

    badgeEl.className = classMap[mode] || classMap.connecting;
    badgeEl.textContent = textMap[mode] || textMap.connecting;

    if (priceEl && Number.isFinite(price)) {
      priceEl.textContent = `${price.toFixed(2)} € / BTC`;
    }

    if (updatedEl) {
      updatedEl.textContent = at
        ? new Date(at).toLocaleTimeString("es-ES", { hour12: false })
        : "--:--:--";
    }
  };

  const pushPoint = (price) => {
    const numeric = +price.toFixed(2);

    if (priceData.length === 0) {
      // Sembramos la serie inicial con el primer precio real para evitar saltos.
      const seed = Array.from({ length: MAX_POINTS }, () => numeric);
      priceData.push(...seed);
      const now = Date.now();
      const seedLabels = Array.from({ length: MAX_POINTS }, (_, idx) => {
        const back = MAX_POINTS - idx;
        return new Date(now - back * 1000).toLocaleTimeString("es-ES", { hour12: false });
      });
      timeLabels.push(...seedLabels);
    } else {
      priceData.push(numeric);
      if (priceData.length > MAX_POINTS) priceData.shift();

      timeLabels.push(new Date().toLocaleTimeString("es-ES", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }));
      if (timeLabels.length > MAX_POINTS) timeLabels.shift();
    }

    // Re-escala el eje Y de forma suave
    ryanairChart.options.scales.y.min = Math.min(...priceData) * 0.995;
    ryanairChart.options.scales.y.max = Math.max(...priceData) * 1.005;
    ryanairChart.update();
  };

  const fallbackDrift = () => {
    if (lastPrice === null) return;
    const jitter = (Math.random() - 0.5) * 0.25; // pequeño desplazamiento para no ser caótico
    lastPrice = +(lastPrice + jitter).toFixed(2);
    pushPoint(lastPrice);
    updateBadge("error", lastPrice, Date.now());
  };

  const pollPrice = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5500);
      const response = await fetch(API_PATH, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`status ${response.status}`);

      const payload = await response.json();
      const price = parseFloat(payload?.price);
      if (!Number.isFinite(price)) throw new Error("invalid price");

      lastPrice = price;
      pushPoint(price);
      const mode = payload?.source === "live"
        ? "live"
        : payload?.source === "cache"
          ? "cache"
          : payload?.source === "simulated"
            ? "cache"
            : "cache";
      updateBadge(mode, price, payload?.at || Date.now());
    } catch (err) {
      console.warn("No se pudo actualizar la cotización en vivo:", err);
      fallbackDrift();
      updateBadge("error", lastPrice ?? NaN, Date.now());
    }
  };

  updateBadge("connecting", null, null);
  pollPrice();
  // Refresco rápido porque la API está cacheada en backend.
  setInterval(pollPrice, 7000);

  canvas.addEventListener("click", () => {
    window.open("https://www.coingecko.com/es/monedas/bitcoin", "_blank");
  });
});
