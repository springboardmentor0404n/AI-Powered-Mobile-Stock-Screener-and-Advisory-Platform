import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import psycopg2
import requests
import math

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

# =========================================================
# LOGIN PAGE
# =========================================================
def login():
    st.title("📈 AI Stock Dashboard")
    st.subheader("Login")

    username = st.text_input("Username")
    password = st.text_input("Password", type="password")

    if st.button("Login"):
        if username == "srishitha0616@gmail.com" and password == "Rishi@05":
            st.session_state.logged_in = True
            st.session_state.username = username
            st.success("Login successful")
            st.rerun()
        else:
            st.error("Invalid credentials")

# =========================================================
# LOAD & CLEAN DATA
# =========================================================
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

    df.columns = [
        'Industry','Variance_FY_NP','Equity_Latest','FaceValue_Latest','Total_Reserves',
        'Dividend_FY','Sales_FY','NetProfit_FY','CPS_FY','EPS_FY','LatestQuarterDate',
        'Sales_LatestQuarter','BookValue','Networth_FY','PriceToBook','PE_FY','PC_FY',
        'BSE_Value','NSE_Value','High_52wk','Low_52wk','Price_Current','Price_Current2',
        'MarketCap','NetProfit_LatestQuarter','NetProfitVar_LatestQuarter','ResultYear',
        'TTM_Sales','TTM_OP','TTM_OPM','TTM_GP','TTM_GPM','TTM_NP','TTM_NPV','TTM_EPS',
        'TTM_PE','TTM_Depreciation','Equity_Latest_1','LTP','GrossBlock','Total_Loans',
        'Year_OPM','Year_GPM','Quarter_OPM','StockName'
    ][:len(df.columns)]

    # ---------- FINANCIAL CLEANING ----------
    numeric_cols = [
        'Equity_Latest','LTP','MarketCap','NetProfit_FY','Dividend_FY',
        'High_52wk','Low_52wk','Price_Current','TTM_OPM','PE_FY',
        'PriceToBook','CPS_FY'
    ]

    for col in numeric_cols:
        if col in df.columns:
            df[col] = (
                df[col]
                .astype(str)
                .str.replace(",", "", regex=False)
                .str.replace("₹", "", regex=False)
                .str.replace("%", "", regex=False)
                .str.replace("-", "", regex=False)
                .str.strip()
            )
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df["LatestQuarterDate"] = pd.to_datetime(df["LatestQuarterDate"], errors="coerce")

    return df
# =========================================================
# DASHBOARD
# =========================================================
def dashboard():
    df = load_clean_data()

    st.title(f"Welcome, {st.session_state.username} 👋")
    st.markdown("---")

    tab1, tab2, tab3 = st.tabs(["📊 Portfolio", "👁 Watchlist", "🤖 Query Analysis"])

    # =====================================================
    # PORTFOLIO TAB
    # =====================================================
       # =====================================================
    # PORTFOLIO TAB
    # =====================================================
    with tab1:
        st.subheader("Portfolio Overview")

        c1, c2, c3, c4 = st.columns(4)

        df['LTP_FIXED'] = df['LTP'].apply(
    lambda x: x * 1000 if x < 10 else x
)

        total_market_cap = df['MarketCap'].sum(skipna=True)
        avg_price = df['LTP'].dropna().mean()
        total_net_profit = df['NetProfit_FY'].sum(skipna=True)
        avg_dividend = df['Dividend_FY'].mean(skipna=True)

        c1.metric("Total Market Cap", f"{total_market_cap:,.0f}")
        c2.metric("Avg Price", f"{avg_price:,.2f}")
        c3.metric("Total Net Profit", f"{total_net_profit:,.0f}")
        c4.metric("Avg Dividend %", f"{avg_dividend:.2f}%")

        # -------- CANDLESTICK
        fig = go.Figure(go.Candlestick(
            x=df['StockName'],
            open=df['Price_Current'],
            high=df['High_52wk'],
            low=df['Low_52wk'],
            close=df['LTP']
        ))

        fig.update_layout(
            height=600,
            title="Stock Price Overview",
            xaxis_tickangle=-45
        )

        st.plotly_chart(fig, use_container_width=True)

    # =====================================================
    # WATCHLIST TAB
    # =====================================================
    # ---------------- Watchlist / Industry Overview ----------------
with tab2:
    st.markdown("## 📋 Watchlist & Industry Overview")

    # --- Industry selection
    industries = sorted(df[industry_col].dropna().unique())
    selected_ind = st.selectbox("Select Industry", industries)
    watch_df = df[df[industry_col] == selected_ind]

    st.markdown(f"### Selected Industry: **{selected_ind}**")

    # --- Stock Table with key metrics
    table_df = watch_df[[stock_col, ltp_col, profit_col, mcap_col]].copy()
    table_df.rename(columns={
        stock_col: "Stock",
        ltp_col: "Price",
        profit_col: "Profit Margin (%)",
        mcap_col: "Market Cap"
    }, inplace=True)

    # Color-code Profit Margin
    def color_profit(val):
        color = 'green' if val >= 0 else 'red'
        return f'color: {color}'

    st.dataframe(
        table_df.style.applymap(color_profit, subset=["Profit Margin (%)"]),
        height=250
    )

    # ---- 1️⃣ LINE CHART - Price Trend
    st.markdown("#### 📈 Price Trend")
    fig_price = go.Figure()
    for stock in watch_df[stock_col].unique():
        stock_df = watch_df[watch_df[stock_col] == stock]
        fig_price.add_trace(go.Scatter(
            x=stock_df[quarter_col],
            y=stock_df[ltp_col],
            mode='lines+markers',
            name=stock,
            line=dict(width=3),
            marker=dict(size=6)
        ))
    fig_price.update_layout(
        height=400,
        xaxis_title="Quarter",
        yaxis_title="Price",
        hovermode="x unified",
        legend_title="Stock",
        template="plotly_white"
    )
    st.plotly_chart(fig_price, use_container_width=True)

    # ---- 2️⃣ Market Cap
    st.markdown("#### 💰 Market Cap")
    fig_mcap = go.Figure(go.Bar(
        x=watch_df[stock_col],
        y=watch_df[mcap_col],
        text=watch_df[mcap_col],
        textposition='auto'
    ))
    fig_mcap.update_layout(
        height=350,
        xaxis_title="Stock",
        yaxis_title="Market Cap",
        template="plotly_white"
    )
    st.plotly_chart(fig_mcap, use_container_width=True)

    # ---- 3️⃣ Profit Margin
    st.markdown("#### 📊 Profit Margin")
    colors = ['green' if x >= 0 else 'red' for x in watch_df[profit_col]]
    fig_profit = go.Figure(go.Bar(
        x=watch_df[stock_col],
        y=watch_df[profit_col],
        marker_color=colors,
        text=watch_df[profit_col],
        textposition='auto'
    ))
    fig_profit.update_layout(
        height=350,
        xaxis_title="Stock",
        yaxis_title="Profit Margin (%)",
        template="plotly_white"
    )
    st.plotly_chart(fig_profit, use_container_width=True)

    # ---- 4️⃣ Pie Chart
    st.markdown("#### 🥧 Profit Margin Distribution")
    profit_pie = watch_df.groupby(stock_col)[profit_col].mean()
    fig_pie = go.Figure(go.Pie(
        labels=profit_pie.index,
        values=profit_pie.values,
        hole=0.4
    ))
    fig_pie.update_layout(height=350)
    st.plotly_chart(fig_pie, use_container_width=True)

    # ---- 5️⃣ 52W High vs Low
    st.markdown("#### 📏 52W High vs Low")
    fig_range = go.Figure()
    fig_range.add_bar(x=watch_df[stock_col], y=watch_df[high_col], name='52W High')
    fig_range.add_bar(x=watch_df[stock_col], y=watch_df[low_col], name='52W Low')
    fig_range.update_layout(
        barmode='group',
        height=350,
        template="plotly_white"
    )
    st.plotly_chart(fig_range, use_container_width=True)

    # ---- 6️⃣ Radar Chart
    st.markdown("#### 🧭 Stock Ratios Radar Chart")
    ratio_cols = [pe_col, pb_col, cps_col]
    fig_radar = go.Figure()
    for stock in watch_df[stock_col].unique():
        row = watch_df[watch_df[stock_col] == stock].iloc[0]
        fig_radar.add_trace(go.Scatterpolar(
            r=[row[col] if pd.notna(row[col]) else 0 for col in ratio_cols],
            theta=ratio_cols,
            fill='toself',
            name=stock
        ))
    fig_radar.update_layout(
        polar=dict(radialaxis=dict(visible=True)),
        height=450,
        showlegend=True
    )
    st.plotly_chart(fig_radar, use_container_width=True)


    # =====================================================
    # QUERY ANALYSIS TAB
    # =====================================================
    with tab3:
        st.subheader("🤖 AI Query Analysis")

        query = st.text_area("Ask about stocks, industries, profits, trends")

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

# =========================================================
# MAIN
# =========================================================
if not st.session_state.logged_in:
    login()
else:
    dashboard()
