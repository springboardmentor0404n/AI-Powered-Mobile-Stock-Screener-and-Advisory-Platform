/* ================= TOKEN SAFETY ================= */
let token = localStorage.getItem("token");

if (!token) {
    alert("Session expired. Please login again.");
    window.location.href = "login.html";
}


/* ================= AI SCREENER DOM BINDINGS ================= */
const aiInput   = document.getElementById("aiInput");
const priceText = document.getElementById("priceText");
const aiTrend   = document.getElementById("aiTrend");
const aiOutlook = document.getElementById("aiOutlook");
const aiResult  = document.getElementById("aiResult");

/* ================= AUTH ================= */

if (!token) window.location.href = "login.html";

/* ================= STATE ================= */
let stocks = [];
// ✅ Persisted searched stocks
let extraStocks = JSON.parse(localStorage.getItem("extraStocks")) || [];
let watchlist = JSON.parse(localStorage.getItem("watchlist")) || [];
let portfolio = JSON.parse(localStorage.getItem("portfolio")) || [];
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

let alertCount = 0;
let ai5yChart = null;

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
    showSection("ai");          // ✅ DEFAULT SECTION
    loadStocks();
    startAlertChecker();
});

/* ================= SECTION SWITCH ================= */
function showSection(id) {
    document.querySelectorAll("section").forEach(s => s.classList.add("hidden"));

    const section = document.getElementById(id);
    if (!section) return;

    section.classList.remove("hidden");

    if (id === "watchlist") renderWatchlist();
    if (id === "portfolio") renderPortfolio();
}

/* ================= LOAD STOCKS ================= */
/* ================= LOAD STOCKS (STEP-1 FIX) ================= */
function loadStocks() {
    fetch("http://127.0.0.1:5000/api/stocks")
        .then(res => res.json())
        .then(data => {

            // ✅ Merge CSV stocks + searched stocks
            stocks = [...extraStocks, ...data];

            renderStocks(stocks);
            updateMarketOverview(stocks);
        })
        .catch(err => console.error("Stock load error", err));
}


/* ================= DASHBOARD STOCK CARDS ================= */
function renderStocks(list) {
    const container = document.getElementById("cards");
    if (!container) return;

    container.innerHTML = "";

    list.forEach(s => {
        const trend = s.price % 2 === 0 ? "Bullish 📈" : "Stable ➖";
        const risk = s.price > 3000 ? "High ⚠️" : "Moderate ⚡";
        const fav = favorites.includes(s.symbol);

        const div = document.createElement("div");
        div.className = "card";

        div.onclick = () => {
            window.location.href = `stock.html?symbol=${s.symbol}`;
        };

        div.innerHTML = `
            <div class="card-header">
                <h3>${s.symbol}</h3>
                <span class="star ${fav ? "active" : ""}"
                      onclick="event.stopPropagation(); toggleFavorite('${s.symbol}', this)">
                    ★
                </span>
            </div>

            <div class="price">₹${s.price.toFixed(2)}</div>

            <div class="stock-insights">
                <div>Trend: <strong>${trend}</strong></div>
                <div>Risk: <strong>${risk}</strong></div>
            </div>

            <button onclick="event.stopPropagation(); addToWatchlist('${s.symbol}')">
                + Watchlist
            </button>

            <button onclick="event.stopPropagation(); addToPortfolio('${s.symbol}', ${s.price})">
                + Portfolio
            </button>
        `;

        container.appendChild(div);
    });
}

/* ================= FAVORITES ================= */
function toggleFavorite(symbol, el) {
    if (favorites.includes(symbol)) {
        favorites = favorites.filter(s => s !== symbol);
        el.classList.remove("active");
    } else {
        favorites.push(symbol);
        el.classList.add("active");
    }
    localStorage.setItem("favorites", JSON.stringify(favorites));
}

/* ================= WATCHLIST ================= */
function addToWatchlist(sym) {
    if (!watchlist.includes(sym)) {
        watchlist.push(sym);
        localStorage.setItem("watchlist", JSON.stringify(watchlist));
    }
}

function renderWatchlist() {
    const d = document.getElementById("watchlistItems");
    if (!d) return;

    d.innerHTML = "";

    if (!watchlist.length) {
        d.innerHTML = "<p>No stocks in watchlist</p>";
        return;
    }

    watchlist.forEach(sym => {
        const stock = stocks.find(s => s.symbol === sym);
        if (!stock) return;

        const div = document.createElement("div");
        div.className = "watch-card";

        div.innerHTML = `
            <strong style="cursor:pointer"
                    onclick="openStock('${sym}')">
                ${sym}
            </strong>

            <span>₹${stock.price.toFixed(2)}</span>

            <button onclick="removeWatch('${sym}')">Remove</button>
        `;

        d.appendChild(div);
    });
}

function removeWatch(sym) {
    watchlist = watchlist.filter(s => s !== sym);
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
    renderWatchlist();
}

function openStock(symbol) {
    window.location.href = `stock.html?symbol=${symbol}`;
}

/* ================= PORTFOLIO ================= */
function addToPortfolio(symbol, price) {
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) item.qty += 1;
    else portfolio.push({ symbol, qty: 1, buy: price });

    localStorage.setItem("portfolio", JSON.stringify(portfolio));
}

function renderPortfolio() {
    const table = document.getElementById("portfolioTable");
    if (!table) return;

    table.innerHTML = "";

    let invested = 0, current = 0;

    portfolio.forEach(p => {
        const stock = stocks.find(s => s.symbol === p.symbol);
        if (!stock) return;

        const inv = p.buy * p.qty;
        const curr = stock.price * p.qty;

        invested += inv;
        current += curr;

        table.innerHTML += `
            <tr>
                <td>${p.symbol}</td>
                <td>${p.qty}</td>
                <td>₹${p.buy.toFixed(2)}</td>
                <td>₹${stock.price.toFixed(2)}</td>
                <td style="color:${curr - inv >= 0 ? "green" : "red"}">
                    ₹${(curr - inv).toFixed(2)}
                </td>
            </tr>
        `;
    });

    document.getElementById("totalInvested").innerText = "₹" + invested.toFixed(2);
    document.getElementById("currentValue").innerText = "₹" + current.toFixed(2);
    document.getElementById("totalPL").innerText = "₹" + (current - invested).toFixed(2);
}

/* ================= AI SCREENER ================= */
function askAI() {
    const symbol = aiInput.value.trim().toUpperCase();
    if (!symbol) return;

    fetch("http://127.0.0.1:5000/api/ai-query", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ query: symbol })
    })
    .then(res => {
        if (res.status === 401) {
            alert("Session expired. Please login again.");
            localStorage.clear();
            window.location.href = "login.html";
            return;
        }
        return res.json();
    })
    .then(d => {
        if (!d) return;

        priceText.innerText = d.price ? "₹" + d.price : "₹ --";
        aiResult.innerText = d.analysis || "No analysis available";

        aiTrend.innerText = "Stable";
        aiOutlook.innerText = "Long-term bullish";

        renderAI5YearChart(d.price || 100);
    })
    .catch(() => {
        aiResult.innerText = "❌ AI service unavailable";
    });
}

/* ================= 5 YEAR CHART ================= */
function renderAI5YearChart(currentPrice) {
    const ctx = document.getElementById("ai5yChart");
    if (!ctx) return;

    const labels = ["2019","2020","2021","2022","2023","2024"];
    const prices = labels.map((_, i) =>
        Math.round(currentPrice * (0.6 + i * 0.08))
    );

    if (ai5yChart) ai5yChart.destroy();

    ai5yChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                data: prices,
                borderColor: "#16a34a",
                backgroundColor: "rgba(22,163,74,0.15)",
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 6
            }]
        },
        options: {
            plugins: { legend: { display: false } }
        }
    });
}

/* ================= ALERT SYSTEM ================= */
function toggleNotifications() {
    document.getElementById("notificationPanel").classList.toggle("hidden");
    alertCount = 0;
    updateAlertBadge();

    // ❌ DO NOT overwrite alerts
    // showAlertStatus();
}


function updateAlertBadge() {
    const badge = document.getElementById("alertCount");
    if (alertCount > 0) {
        badge.innerText = alertCount;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

function checkAlerts() {
    fetch("http://127.0.0.1:5000/api/alerts/check", {
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => res.json())
    .then(data => {
        if (data.alerts && data.alerts.length > 0) {
            const list = document.getElementById("alertList");
            list.innerHTML = "";

            data.alerts.forEach(msg => {
                const div = document.createElement("div");
                div.className = "alert-item";
                div.innerText = msg;
                list.appendChild(div);
            });

            alertCount += data.alerts.length;
            updateAlertBadge();
            document.querySelector(".notify-btn").classList.add("shake");
        }
    });
}

function startAlertChecker() {
    checkAlerts();
    setInterval(checkAlerts, 30000);
}

/* ================= THEME ================= */
function toggleTheme() {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
}

/* ================= LOGOUT ================= */
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}
/* ================= MARKET OVERVIEW FIX ================= */
function updateMarketOverview(stocks) {
    if (!stocks || stocks.length === 0) return;

    // Average price from CSV
    const avgPrice =
        stocks.reduce((sum, s) => sum + Number(s.price || 0), 0) / stocks.length;

    const change = (Math.random() * 2 - 1).toFixed(2); // fake % change

    document.getElementById("mPrice").innerText =
        "₹" + avgPrice.toFixed(2);

    document.getElementById("mChange").innerText =
        (change > 0 ? "+" : "") + change + "%";

    document.getElementById("mChange").style.color =
        change >= 0 ? "green" : "red";

    document.getElementById("mVolume").innerText =
        (stocks.length * 100000).toLocaleString();

    document.getElementById("mPE").innerText =
        (Math.random() * 10 + 10).toFixed(1);

    document.getElementById("mCap").innerText =
        "₹" + (stocks.length * 1200).toLocaleString() + " Cr";
}
/* ================= DASHBOARD SEARCH ================= */
function searchDashboardStock() {
    const query = document
        .getElementById("dashboardSearch")
        .value
        .trim()
        .toUpperCase();

    if (!query) {
        renderStocks(stocks); // restore CSV cards
        return;
    }

    // 1️⃣ Search in CSV stocks
    const filtered = stocks.filter(s =>
        s.symbol.includes(query)
    );

    if (filtered.length > 0) {
        renderStocks(filtered);
        return;
    }

    // 2️⃣ If not in CSV → fetch live price & show card
    fetch("http://127.0.0.1:5000/api/ai-query", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ query })
    })
    .then(res => res.json())
    .then(d => {
        if (!d.price || d.price <= 0) {
            renderStocks([]);
            return;
        }

       const tempStock = {
    symbol: query,
    price: d.price
};

// ✅ Save permanently
extraStocks = extraStocks.filter(s => s.symbol !== query);
extraStocks.unshift(tempStock);

localStorage.setItem("extraStocks", JSON.stringify(extraStocks));

// ✅ Update global stocks list
stocks = [...extraStocks, ...stocks.filter(s => s.symbol !== query)];

// ✅ Show searched stock
renderStocks([tempStock]);


// ✅ ADD searched stock into global stocks list (TEMP)
stocks = stocks.filter(s => s.symbol !== query); // avoid duplicates
stocks.unshift(tempStock);

// ✅ render only searched stock
renderStocks([tempStock]);

    })
    .catch(() => {
        renderStocks([]);
    });
} 
function showAlertStatus() {
    const list = document.getElementById("notification-list");
    if (!list) return;

    const activeAlerts = JSON.parse(localStorage.getItem("watchlist"))?.length || 0;

    const now = new Date().toLocaleTimeString();

    list.innerHTML += `
    <div class="alert-item status">
        ⏱ Alerts checked at ${now}
    </div>
    <div class="alert-item status">
        👀 Monitoring ${activeAlerts} stocks
    </div>
`;

}
function setPercentAlert() {
    const symbol = aiInput.value.trim().toUpperCase();
    const percent = document.getElementById("percentSlider").value;

    if (!symbol) {
        alert("Enter stock symbol first");
        return;
    }

    fetch("http://127.0.0.1:5000/api/ai-query", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            query: `alert me if ${symbol} moves ${percent} percent`
        })
    })
    .then(res => res.json())
    .then(d => alert(d.analysis));
}
/* ================= AUTO PRICE REFRESH ================= */
function refreshLivePrices() {

    // Refresh AI Screener price if symbol entered
    const symbol = aiInput?.value?.trim().toUpperCase();
    if (symbol) {
        fetch("http://127.0.0.1:5000/api/ai-query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ query: symbol })
        })
        .then(res => res.json())
        .then(d => {
            if (d?.price) {
                priceText.innerText = "₹" + d.price;
                renderAI5YearChart(d.price);
            }
        });
    }

    // Refresh dashboard prices
    loadStocks();
}

// 🔁 Refresh every 30 seconds
setInterval(refreshLivePrices, 30000);
/* ================= AUTO PRICE REFRESH ================= */
function refreshLivePrices() {

    // 🔄 Refresh AI Screener price if symbol entered
    const symbol = aiInput?.value?.trim().toUpperCase();
    if (symbol) {
        fetch("http://127.0.0.1:5000/api/ai-query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ query: symbol })
        })
        .then(res => res.json())
        .then(d => {
            if (d && d.price) {
                priceText.innerText = "₹" + d.price;
                renderAI5YearChart(d.price);
            }
        })
        .catch(() => {});
    }

    // 🔄 Refresh dashboard prices
    loadStocks();
}

// 🔁 Refresh every 30 seconds
setInterval(refreshLivePrices, 30000);
function checkAlerts() {
    fetch("http://127.0.0.1:5000/api/alerts/check", {
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => res.json())
    .then(data => {
        if (!data.alerts || data.alerts.length === 0) return;

        data.alerts.forEach(msg => {
            addNotification("🔔 " + msg);
            alertCount++;
        });

        updateAlertBadge();
        document.querySelector(".notify-btn").classList.add("shake");
    })
    .catch(err => console.error("Alert check error", err));
}

/* ================= ALERT CHECK (AUTO) ================= */

async function checkAlerts() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("http://127.0.0.1:5000/api/alerts/check", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await res.json();
        if (!data.alerts || data.alerts.length === 0) return;

        data.alerts.forEach(a => {
            alert(
                `🔔 ALERT TRIGGERED\n\n` +
                `${a.symbol} ${a.condition} ₹${a.target}\n` +
                `Current Price: ₹${a.price}`
            );
        });

    } catch (err) {
        console.error("Alert check failed", err);
    }
}

/* 🔁 Check alerts every 30 seconds */
setInterval(checkAlerts, 30000);

/* Also check once when page loads */
checkAlerts();


function addNotification(message) {
    const list = document.getElementById("alertList");
    if (!list) return;

    // remove "No new alerts"
    const empty = list.querySelector(".empty");
    if (empty) empty.remove();

    const div = document.createElement("div");
    div.className = "alert-item";
    div.innerText = message;

    list.prepend(div);

    alertCount++;
    updateAlertBadge();
    document.querySelector(".notify-btn").classList.add("shake");
}

const INFO_STOCKS = [
    "INFY",
    "TCS",
    "RELIANCE",
    "HDFCBANK",
    "ICICIBANK",
    "ITC",
    "ONGC"
];
/* ================= ALERT → NOTIFICATIONS ================= */

const notificationList = document.getElementById("notificationList");

function addNotification(text) {
    if (!notificationList) return;

    // remove "No new alerts"
    if (notificationList.children.length === 1 &&
        notificationList.children[0].innerText === "No new alerts") {
        notificationList.innerHTML = "";
    }

    const li = document.createElement("li");
    li.textContent = text;
    li.style.padding = "8px 0";
    notificationList.prepend(li);
}

async function checkAlerts() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("http://127.0.0.1:5000/api/alerts/check", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await res.json();
        if (!data.alerts || data.alerts.length === 0) return;

        data.alerts.forEach(a => {
            const msg =
                a.condition === "ABOVE"
                    ? `📈 ${a.symbol} increased above ₹${a.target} (₹${a.price})`
                    : `📉 ${a.symbol} fell below ₹${a.target} (₹${a.price})`;

            addNotification(msg);
        });

    } catch (e) {
        console.error("Notification alert error", e);
    }
}

/* 🔁 Auto check every 30 seconds */
setInterval(checkAlerts, 30000);

/* First load */
checkAlerts();
/* ================= MERGED ALERTS + LIVE FEED WITH TIMESTAMPS ================= */

document.addEventListener("DOMContentLoaded", () => {

    const notificationList = document.getElementById("notificationList");
    const alertCount = document.getElementById("alertCount");

    if (!notificationList || !alertCount) {
        console.error("❌ Notification elements not found");
        return;
    }

    let count = 0;
    const shownKeys = new Set(); // prevent duplicates

    function timeAgo(ts) {
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 10) return "just now";
        if (diff < 60) return `${diff}s ago`;
        const m = Math.floor(diff / 60);
        if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
        const d = Math.floor(h / 24);
        return `${d} day${d > 1 ? "s" : ""} ago`;
    }

    const MAX_NOTIFICATIONS = 6;

function addNotification(text) {
    const key = text;
    if (shownKeys.has(key)) return;
    shownKeys.add(key);

    const empty = notificationList.querySelector(".empty");
    if (empty) empty.remove();

    const row = document.createElement("div");
    row.className = "notification-item";
    row.style.padding = "8px 0";
    row.style.borderBottom = "1px solid #eee";
    row.dataset.ts = Date.now();

    const msg = document.createElement("div");
    msg.innerText = text;

    const time = document.createElement("small");
    time.style.color = "#777";
    time.style.display = "block";
    time.innerText = "just now";

    row.appendChild(msg);
    row.appendChild(time);

    // Add newest on top
    notificationList.prepend(row);

    // 🔥 LIMIT TO LAST 6 NOTIFICATIONS
    const items = notificationList.querySelectorAll(".notification-item");
    if (items.length > MAX_NOTIFICATIONS) {
        items[items.length - 1].remove(); // remove oldest
    }

    count++;
    alertCount.innerText = count;
    alertCount.classList.remove("hidden");
}

    /* Update all timestamps periodically */
    function refreshTimes() {
        document.querySelectorAll(".notification-item").forEach(item => {
            const ts = Number(item.dataset.ts);
            const small = item.querySelector("small");
            if (small && ts) small.innerText = timeAgo(ts);
        });
    }

    /* ========== REAL BACKEND ALERTS ========== */
    async function checkRealAlerts() {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const res = await fetch("http://127.0.0.1:5000/api/alerts/check", {
                headers: { "Authorization": "Bearer " + token }
            });

            const data = await res.json();
            if (!data.alerts || data.alerts.length === 0) return;

            data.alerts.forEach(a => {
                const msg =
                    a.condition === "ABOVE"
                        ? `🔔 ${a.symbol} crossed ₹${a.target} (₹${a.price})`
                        : `🔔 ${a.symbol} fell below ₹${a.target} (₹${a.price})`;
                addNotification(msg);
            });

        } catch (e) {
            console.error("Real alert error", e);
        }
    }

    /* ========== LIVE STOCK FEED ========== */
    function startLiveFeed() {
        const stocks = ["INFY", "TCS", "RELIANCE", "AXISBANK", "HDFCBANK", "ITC"];
        setInterval(() => {
            const stock = stocks[Math.floor(Math.random() * stocks.length)];
            const percent = (Math.random() * 2).toFixed(2);
            const up = Math.random() > 0.5;

            const msg = up
                ? `📈 ${stock} increased by ${percent}%`
                : `📉 ${stock} fell by ${percent}%`;

            addNotification(msg);
        }, 7000);
    }

    /* ========== START ========== */
    checkRealAlerts();
    setInterval(checkRealAlerts, 30000);
    startLiveFeed();
    setInterval(refreshTimes, 30000); // update "2 min ago" labels

});
