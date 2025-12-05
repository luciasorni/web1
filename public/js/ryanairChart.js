document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("ryanairChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Datos iniciales
  let priceData = Array.from({ length: 10 }, () => +(25 + Math.random()).toFixed(2));
  let timeLabels = Array.from({ length: 10 }, (_, i) => `-${10 - i}s`);

  const ryanairChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        label: "Precio Ryanair (€)",
        data: priceData,
        borderWidth: 2,
        fill: true,
        tension: 0.2,

        // 👉 Colores dinámicos por tramo
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
      plugins: { legend: { display: false }},
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: "rgba(0,0,0,0.05)" }
        },
        x: { grid: { display: false }}
      }
    }
  });

  // 👉 Actualizar cada 5s
  setInterval(() => {
    const last = priceData.at(-1);
    const newPrice = +(last + (Math.random() - 0.5) * 0.6).toFixed(2);

    priceData.push(newPrice);
    priceData.shift();

    const now = new Date();
    timeLabels.push(now.toLocaleTimeString());
    timeLabels.shift();

    ryanairChart.update();
  }, 5000);

});

document.getElementById("ryanairChart").onclick = () => {
    window.open("https://investor.ryanair.com/investors-shareholders/share-price/", "_blank");
};

