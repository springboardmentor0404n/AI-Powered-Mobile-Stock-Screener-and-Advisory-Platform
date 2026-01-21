import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import psycopg2
import requests
import yfinance as yf
from datetime import datetime
from streamlit_autorefresh import st_autorefresh  # auto-refresh every 60s

# =========================================================
# PAGE CONFIG
# =========================================================
st.set_page_config(
    page_title="AI Stock Dashboard",
    page_icon="📈",
    layout="wide"
)

# =========================================================
# SESSION STATE
# =========================================================
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "username" not in st.session_state:
    st.session_state.username = ""
if "prev_stock_prices" not in st.session_state:
    st.session_state.prev_stock_prices = {}
if "live_notifications" not in st.session_state:
    st.session_state.live_notifications = []

# =========================================================
# MARKETSTACK API & Famous Stocks
# =========================================================
#API_KEY = "E34CCGFJNR64E8HO"  # Replace with your key

FAMOUS_STOCKS = {
    "RELIANCE": "RELIANCE.BO",
    "TCS": "TCS.BO",
    "INFY": "INFY.BO",
    "HDFCBANK": "HDFCBANK.BO",
    "ICICIBANK": "ICICIBANK.BO",
    "SBIN": "SBIN.BO",
    "HINDUNILVR": "HINDUNILVR.BO",
    "AXISBANK": "AXISBANK.BO",
    "ITC": "ITC.BO",
    "LT": "LT.BO",
    "MARUTI": "MARUTI.BO",
    "HCLTECH": "HCLTECH.BO",
    "KOTAKBANK": "KOTAKBANK.BO",
    "BAJAJFINSV": "BAJAJFINSV.BO",
    "BAJFINANCE": "BAJFINANCE.BO"
}



# =========================================================
# LOGIN PAGE
# =========================================================
def login():
    st.markdown("""
    <style>
    /* FULL APP BACKGROUND */
    .stApp {
        background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
    }

    /* CENTER CONTAINER */
    .auth-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
    }

    /* GLASS CARD */
    .auth-card {
        width: 420px;
        padding: 40px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(12px);
        box-shadow: 0px 20px 50px rgba(0,0,0,0.4);
        color: white;
    }

    .auth-title {
        font-size: 30px;
        font-weight: 700;
        text-align: center;
        margin-bottom: 5px;
    }

    .auth-subtitle {
        text-align: center;
        font-size: 14px;
        color: #d1d1d1;
        margin-bottom: 30px;
    }

    .auth-footer {
        text-align: center;
        margin-top: 20px;
        font-size: 13px;
        color: #ccc;
    }
    </style>
    """, unsafe_allow_html=True)

    st.markdown("<div class='auth-container'><div class='auth-card'>", unsafe_allow_html=True)

    st.markdown("<div class='auth-title'>📈 AI Stock Dashboard</div>", unsafe_allow_html=True)
    st.markdown("<div class='auth-subtitle'>Trade insights. Smarter decisions.</div>", unsafe_allow_html=True)

    mode = st.radio("", ["Login", "Sign Up"], horizontal=True)

    if mode == "Login":
        username = st.text_input("👤 Username")
        password = st.text_input("🔒 Password", type="password")

        if st.button("🚀 Login", use_container_width=True):
            if username == "srishitha0616@gmail.com" and password == "Rishi@05":
                st.session_state.logged_in = True
                st.session_state.username = username
                st.success("Welcome back!")
                st.rerun()
            else:
                st.error("Invalid credentials")

    else:  # SIGN UP
        new_user = st.text_input("👤 Create Username")
        new_email = st.text_input("📧 Email")
        new_pass = st.text_input("🔒 Create Password", type="password")

        if st.button("✨ Create Account", use_container_width=True):
            st.info("Signup UI ready (connect DB later)")
            st.success("Account created successfully!")

    st.markdown("<div class='auth-footer'>📊 Built for intelligent stock analysis</div>", unsafe_allow_html=True)
    st.markdown("</div></div>", unsafe_allow_html=True)


# =========================================================
# LOAD CLEAN DATA
# =========================================================
@st.cache_data
def load_clean_data():
    conn = psycopg2.connect(
        dbname="stock_data",
        user="postgres",
        password="rishitha",
        host="localhost",
        port=5432
    )
    df = pd.read_sql("SELECT * FROM cleaned_stock_data1", conn)
    conn.close()

    # Clean column names
    df.columns = [col.strip().replace(" ", "_") for col in df.columns]

    # Standardize StockName
    if "stock_name" in df.columns:
        df.rename(columns={"stock_name": "StockName"}, inplace=True)
    elif "StockName" not in df.columns:
        str_cols = df.select_dtypes(include="object").columns
        if len(str_cols) > 0:
            df.rename(columns={str_cols[0]: "StockName"}, inplace=True)

    # Numeric columns conversion
    numeric_cols = ["LTP","MarketCap","NetProfit_FY","Dividend_FY",
                    "High_52wk","Low_52wk","Price_Current","TTM_OPM",
                    "PE_FY","PriceToBook","CPS_FY"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(",","").str.replace("₹","").str.replace("%","").str.strip(), errors="coerce")

    # Dates
    if "LatestQuarterDate" in df.columns:
        df["LatestQuarterDate"] = pd.to_datetime(df["LatestQuarterDate"], errors="coerce")

    # Uppercase StockName
    if "StockName" in df.columns:
        df["StockName"] = df["StockName"].astype(str).str.upper().str.strip()

    return df

# =========================================================
# FETCH LIVE DATA FROM yfinance
# =========================================================
def fetch_live_yfinance(symbol):
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period="1d", interval="5m")
        hist = hist.reset_index()
        hist['Datetime'] = pd.to_datetime(hist['Datetime'])
        return hist[['Datetime', 'Close']]
    except Exception as e:
        st.error(f"Error fetching {symbol}: {e}")
        return pd.DataFrame()
# =========================================================
# FETCH DB NOTIFICATIONS
# =========================================================




# =========================================================
# DASHBOARD
# =========================================================
def dashboard():
    # ---------------- Load Data ----------------
    df = load_clean_data()  # your function to load data

    # Clean column names
    df.columns = df.columns.str.strip()
    df.columns = df.columns.str.lower()

    st.write("Columns in DF:", df.columns.tolist())  # Debug

    st.title(f"Welcome, {st.session_state.username} 👋")
    st.markdown("---")

    # ---------------- Tabs ----------------
    tab1, tab2, tab3, tab4 = st.tabs(
        ["📊 Portfolio", "👁 Watchlist", "🤖 Query Analysis", "📡 Live Market"]
    )

    # ---------------- Portfolio ----------------
    with tab1:
        st.subheader("Portfolio Overview")
        c1, c2, c3, c4 = st.columns(4)

        # Convert numeric columns to avoid type errors
        numeric_cols = [
            'ltp_latest_price_bse_nse',
            'market_cap_bse_nse_market_cap',
            'dividend_full_year_dividend_pct',
            'net_profit_full_year_net_profit'
        ]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        total_market_cap = df['market_cap_bse_nse_market_cap'].sum(skipna=True)
        avg_price = df['ltp_latest_price_bse_nse'][df['ltp_latest_price_bse_nse']>0].mean()
        total_net_profit = df['net_profit_full_year_net_profit'].sum(skipna=True)
        avg_dividend = df['dividend_full_year_dividend_pct'].mean()

        c1.metric("Total Market Cap", f"{total_market_cap:,.0f}")
        c2.metric("Avg Price", f"{avg_price:,.2f}")
        c3.metric("Total Net Profit", f"{total_net_profit:,.0f}")
        c4.metric("Avg Dividend %", f"{avg_dividend:.2f}%")

        # Candlestick chart with profit overlay
        candlestick_cols = [
            'stockname','price_nse_current_market_price','high_52_week_high',
            'low_52_week_low','ltp_latest_price_bse_nse','ttm_opm_trailing_twelve_12_month_operating_profit_margin'
        ]
        if all(col in df.columns for col in candlestick_cols):
            df_sorted = df.dropna(subset=candlestick_cols).sort_values('ttm_opm_trailing_twelve_12_month_operating_profit_margin', ascending=False)
            if len(df_sorted) > 0:
                fig = go.Figure()
                fig.add_trace(go.Candlestick(
                    x=df_sorted['stockname'],
                    open=df_sorted['price_nse_current_market_price'],
                    high=df_sorted['high_52_week_high'],
                    low=df_sorted['low_52_week_low'],
                    close=df_sorted['ltp_latest_price_bse_nse'],
                    increasing_line_color='green',
                    decreasing_line_color='red',
                    name="Price"
                ))
                fig.add_trace(go.Bar(
                    x=df_sorted['stockname'],
                    y=df_sorted['ttm_opm_trailing_twelve_12_month_operating_profit_margin'],
                    marker_color=['green' if x >= 0 else 'red' for x in df_sorted['ttm_opm_trailing_twelve_12_month_operating_profit_margin']],
                    yaxis="y2",
                    opacity=0.3,
                    name="Profit Margin %"
                ))
                fig.update_layout(
                    height=600,
                    xaxis_tickangle=-45,
                    yaxis_title="Price",
                    yaxis2=dict(overlaying="y", side="right", title="Profit Margin %"),
                    title="Portfolio: Candlestick & Profit Margin",
                    template="plotly_white"
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.warning("Portfolio data not sufficient for candlestick chart")
        else:
            st.warning("Required columns for candlestick not found")

    # ---------------- Watchlist ----------------
    with tab2:
        st.subheader("📌 Industry Watchlist – Company Analysis")

        industry_col = "industry_industry_name" if "industry_industry_name" in df.columns else df.columns[0]
        selected_industry = st.selectbox(
            "Select Industry",
            sorted(df[industry_col].dropna().unique())
        )

        watch_df = df[df[industry_col] == selected_industry]

        # KPI Metrics
        st.markdown("### 🔍 Key Industry Metrics")
        c1, c2, c3, c4, c5 = st.columns(5)
        # Convert numeric columns in Watchlist to avoid errors
        watch_numeric_cols = [
            'ltp_latest_price_bse_nse','market_cap_bse_nse_market_cap',
            'ttm_opm_trailing_twelve_12_month_operating_profit_margin',
            'yearly_pe_ratio_full_year_price_to_earning_per_share'
        ]
        for col in watch_numeric_cols:
            if col in watch_df.columns:
                watch_df[col] = pd.to_numeric(watch_df[col], errors='coerce')

        c1.metric("Companies", watch_df["stockname"].nunique())
        c2.metric("Avg Price", f"{watch_df['ltp_latest_price_bse_nse'].mean():,.2f}")
        c3.metric("Avg Market Cap", f"{watch_df['market_cap_bse_nse_market_cap'].mean():,.0f}")
        c4.metric("Avg P/E", f"{watch_df['yearly_pe_ratio_full_year_price_to_earning_per_share'].mean():.2f}")
        c5.metric("Avg Profit %", f"{watch_df['ttm_opm_trailing_twelve_12_month_operating_profit_margin'].mean():.2f}")

        st.divider()

        # Price Trend
        st.markdown("### 📈 Price Trend (Quarter-wise)")
        fig_price = go.Figure()
        for stock in watch_df["stockname"].unique():
            s = watch_df[watch_df["stockname"] == stock].sort_values("latest_quarter_date_latest_quarter_yrc")
            fig_price.add_trace(go.Scatter(
                x=s["latest_quarter_date_latest_quarter_yrc"],
                y=s["ltp_latest_price_bse_nse"],
                mode="lines+markers",
                name=stock,
                line=dict(width=2),
                hovertemplate='<b>%{text}</b><br>Date: %{x}<br>Price: %{y}<extra></extra>',
                text=[stock]*len(s)
            ))
        fig_price.update_layout(
            height=450,
            hovermode="x unified",
            template="plotly_white",
            xaxis_title="Quarter",
            yaxis_title="Price",
            legend_title="Stocks"
        )
        st.plotly_chart(fig_price, use_container_width=True)

        # Market Cap
        st.markdown("### 🏦 Market Capitalization Comparison")
        fig_mcap = go.Figure(go.Bar(
            x=watch_df["stockname"],
            y=watch_df["market_cap_bse_nse_market_cap"],
            text=watch_df["market_cap_bse_nse_market_cap"],
            textposition="auto"
        ))
        fig_mcap.update_layout(height=400, yaxis_title="Market Cap", template="plotly_white")
        st.plotly_chart(fig_mcap, use_container_width=True)

        # Profitability
        st.markdown("### 💰 Profit Margin Comparison")
        fig_profit = go.Figure(go.Bar(
            x=watch_df["stockname"],
            y=watch_df["ttm_opm_trailing_twelve_12_month_operating_profit_margin"],
            marker_color=["green" if x >= 0 else "red" for x in watch_df["ttm_opm_trailing_twelve_12_month_operating_profit_margin"]],
            text=watch_df["ttm_opm_trailing_twelve_12_month_operating_profit_margin"],
            textposition="auto"
        ))
        fig_profit.update_layout(height=400, yaxis_title="Profit Margin %", template="plotly_white")
        st.plotly_chart(fig_profit, use_container_width=True)

        # Valuation Radar
        st.markdown("### 📐 Valuation Radar")
        ratio_cols = [
            "yearly_pe_ratio_full_year_price_to_earning_per_share",
            "price_book_value_price_to_book_value",
            "yearly_pc_ratio_full_year_price_to_cash_per_share"
        ]
        fig_radar = go.Figure()
        for stock in watch_df["stockname"].unique():
            row = watch_df[watch_df["stockname"] == stock].iloc[0]
            fig_radar.add_trace(go.Scatterpolar(
                r=[row[col] if pd.notna(row[col]) else 0 for col in ratio_cols],
                theta=["P/E", "P/B", "CPS"],
                fill="toself",
                name=stock
            ))
        fig_radar.update_layout(height=500, polar=dict(radialaxis=dict(visible=True)), showlegend=True)
        st.plotly_chart(fig_radar, use_container_width=True)

    # ---------------- Query Analysis ----------------
    with tab3:
        st.subheader("🤖 AI Query Analysis")
        query = st.text_area("Ask about stocks, valuation, trends")
        if st.button("Run Query"):
            try:
                res = requests.post(
                    "http://127.0.0.1:5000/query",
                    json={"query": query},
                    timeout=30
                )
                data = res.json()
                st.success("Analysis Ready")
                st.write(data.get("analysis", "No response"))
            except Exception as e:
                st.error(str(e))

    # ---------------- Live Market ----------------
    with tab4:
        st.subheader("📡 Live Market – Famous Companies")
        st_autorefresh(interval=60*1000, key="live_refresh")

        available_stocks = list(FAMOUS_STOCKS.keys())
        stock = st.selectbox("Select Stock (Live)", available_stocks)

    if stock:
        symbol = FAMOUS_STOCKS[stock]
        live_df = fetch_live_yfinance(symbol)

        if live_df.empty:
            st.warning("No live data available for this stock.")
        else:
            latest_price = live_df['Close'].iloc[-1]
            prev_price = st.session_state.prev_stock_prices.get(stock)

            if prev_price is not None and latest_price != prev_price:
                msg = f"💹 Price updated for {stock}: {prev_price:.2f} → {latest_price:.2f}"
                st.session_state.live_notifications.append(msg)

            st.session_state.prev_stock_prices[stock] = latest_price

            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=live_df['Datetime'],
                y=live_df['Close'],
                mode='lines+markers',
                name=stock
            ))
            fig.update_layout(
                height=400,
                title=f"{stock} – Live Price",
                hovermode="x unified"
            )
            st.plotly_chart(fig, use_container_width=True)





# ---------------- Notifications Sidebar ----------------
# ---------------- Notifications Sidebar ----------------
# Ensure session_state for live notifications
if 'live_notifications' not in st.session_state:
    st.session_state.live_notifications = []

# Function to fetch unread notifications from DB
def fetch_db_notifications():
    try:
        conn = psycopg2.connect(
            dbname="stock_data",
            user="postgres",
            password="rishitha",
            host="localhost",
            port=5432
        )
        cur = conn.cursor()
        cur.execute("""
            SELECT message
            FROM stock_notifications2
            WHERE is_read = FALSE
            ORDER BY created_at DESC
            LIMIT 20
        """)
        rows = cur.fetchall()
        conn.close()
        return [r[0] for r in rows]
    except Exception as e:
        st.error(f"Notification fetch failed: {e}")
        return []

# Function to mark notifications as read in DB
def mark_notifications_read():
    try:
        conn = psycopg2.connect(
            dbname="stock_data",
            user="postgres",
            password="rishitha",
            host="localhost",
            port=5432
        )
        cur = conn.cursor()
        cur.execute("""
            UPDATE stock_notifications2
            SET is_read = TRUE
            WHERE is_read = FALSE
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        st.error(f"Notification update failed: {e}")

# Function to insert notification in DB
def insert_db_notification(message):
    try:
        conn = psycopg2.connect(
            dbname="stock_data",
            user="postgres",
            password="rishitha",
            host="localhost",
            port=5432
        )
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO stock_notifications2 (message)
            VALUES (%s)
        """, (message,))
        conn.commit()
        conn.close()
    except Exception as e:
        st.error(f"Notification insert failed: {e}")

# ---------------- Sidebar ----------------
with st.sidebar:
    st.subheader("🔔 Notifications")

    # Fetch notifications from DB + live session notifications
    db_notifications = fetch_db_notifications()
    combined_notifications = db_notifications + st.session_state.live_notifications[::-1]

    if combined_notifications:
        for note in combined_notifications:
            st.info(note)

        # Mark DB notifications as read after displaying
        mark_notifications_read()
        # Clear session notifications once displayed
        st.session_state.live_notifications = []
    else:
        st.write("No new notifications")

    # Optional: Add stock input in sidebar
    new_stock = st.text_input("Add Stock to Portfolio")
    if st.button("Add Stock"):
        if new_stock:
            # Insert the new stock into your portfolio table
            # insert_stock_to_db(new_stock)  # Implement this function
            # Insert notification in DB
            insert_db_notification(f"📌 {new_stock} added to portfolio")
            # Append to session notifications for immediate display
            st.session_state.live_notifications.append(f"📌 {new_stock} added to portfolio")
            st.success(f"{new_stock} added!")

# =========================================================
# MAIN
# =========================================================
if not st.session_state.logged_in:
    login()
else:
    dashboard()
