document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("ryanairChart");
  if (!canvas || typeof Chart === "undefined") return;

  const ctx = canvas.getContext("2d");
  const API_PATH = "/api/stocks/ryanair";
  const MAX_POINTS = 20;

  // Arrancamos con una serie plana para evitar saltos al cargar.
  let lastPrice = 25 + Math.random();
  const priceData = Array.from({ length: MAX_POINTS }, () => +lastPrice.toFixed(2));
  const timeLabels = Array.from({ length: MAX_POINTS }, (_, i) => `-${MAX_POINTS - i}s`);

  const ryanairChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: timeLabels,
      datasets: [{
        label: "Precio Ryanair (€)",
        data: priceData,
        borderWidth: 2,
        fill: true,
        tension: 0.2,
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
          grid: { color: "rgba(0,0,0,0.05)" }
        },
        x: { grid: { display: false } }
      }
    }
  });

  const pushPoint = (price) => {
    priceData.push(+price.toFixed(2));
    if (priceData.length > MAX_POINTS) priceData.shift();

    timeLabels.push(new Date().toLocaleTimeString("es-ES", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }));
    if (timeLabels.length > MAX_POINTS) timeLabels.shift();

    ryanairChart.update();
  };

  const fallbackDrift = () => {
    const jitter = (Math.random() - 0.5) * 0.6;
    lastPrice = +(lastPrice + jitter).toFixed(2);
    pushPoint(lastPrice);
  };

  const pollPrice = async () => {
    try {
      const response = await fetch(API_PATH, { cache: "no-store" });
      if (!response.ok) throw new Error(`status ${response.status}`);

      const payload = await response.json();
      const price = parseFloat(payload?.price);
      if (!Number.isFinite(price)) throw new Error("invalid price");

      lastPrice = price;
      pushPoint(price);
    } catch (err) {
      console.warn("No se pudo actualizar la cotización de Ryanair:", err);
      fallbackDrift();
    }
  };

  // Primera carga + refresco periódico (10 s para no saturar la API externa).
  pollPrice();
  setInterval(pollPrice, 10000);

  canvas.addEventListener("click", () => {
    window.open("https://investor.ryanair.com/investors-shareholders/share-price/", "_blank");
  });
});
