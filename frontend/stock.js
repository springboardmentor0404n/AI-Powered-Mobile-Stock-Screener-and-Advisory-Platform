const params = new URLSearchParams(window.location.search);
const symbol = params.get("symbol");

let priceChart = null;
let volumeChart = null;
let range = 30;

document.getElementById("stockTitle").innerText = symbol + " Analytics";

/* ================= FETCH REAL HISTORY ================= */
fetch(`http://127.0.0.1:5000/api/history/${symbol}`)
    .then(res => res.json())
    .then(data => {
        if (!data || !data.prices || data.prices.length < 2) {
            console.error("No historical data");
            return;
        }

        window.labels = data.labels;
        window.prices = data.prices;

        renderCharts();
    })
    .catch(err => console.error("History fetch error:", err));

/* ================= RANGE ================= */
function setRange(r, btn) {
    range = r;

    document.querySelectorAll(".range-buttons button")
        .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    renderCharts();
}

/* ================= RENDER ================= */
function renderCharts() {
    const labels = window.labels.slice(-range);
    const prices = window.prices.slice(-range);

    renderPriceChart(labels, prices);
    renderVolumeChart(labels, prices);
    renderInsight(prices);
}

/* ================= PRICE TREND ================= */
function renderPriceChart(labels, prices) {
    const ctx = document.getElementById("priceChart");
    if (!ctx) return;

    if (priceChart) priceChart.destroy();

    const up = prices[prices.length - 1] >= prices[0];

    priceChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                data: prices,
                borderColor: up ? "#22c55e" : "#ef4444",
                backgroundColor: up
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(239,68,68,0.2)",
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    ticks: { callback: v => "₹" + v },
                    grid: { color: "#eee" }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

/* ================= VOLUME (DERIVED FROM PRICE MOVE) ================= */
function renderVolumeChart(labels, prices) {
    const ctx = document.getElementById("volumeChart");
    if (!ctx) return;

    if (volumeChart) volumeChart.destroy();

    const volumes = prices.map((p, i) =>
        i === 0 ? 0 : Math.abs(prices[i] - prices[i - 1]) * 150000
    );

    volumeChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                data: volumes,
                backgroundColor: "rgba(59,130,246,0.75)",
                borderRadius: 6
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    ticks: { callback: v => Math.round(v).toLocaleString() },
                    grid: { color: "#eee" }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

/* ================= AI INSIGHT ================= */
function renderInsight(prices) {
    const diff = prices[prices.length - 1] - prices[0];
    const pct = ((diff / prices[0]) * 100).toFixed(2);

    document.getElementById("candleExplain").innerText =
        diff > 0
            ? `AI Insight: Uptrend (+${pct}%). Strong buying pressure.`
            : `AI Insight: Downtrend (${pct}%). Selling pressure dominates.`;
}
