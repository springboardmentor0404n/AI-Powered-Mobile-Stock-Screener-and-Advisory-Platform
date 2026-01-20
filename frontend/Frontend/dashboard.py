import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import psycopg2
import math
import requests

# -----------------------------
# Page Config
# -----------------------------
st.set_page_config(page_title="AI Stock Dashboard", layout="wide", page_icon="📈")

# -----------------------------
# Session State
# -----------------------------
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "username" not in st.session_state:
    st.session_state.username = ""
if "nav" not in st.session_state:
    st.session_state.nav = "Portfolio"

# -----------------------------
# Load & Clean Data
# -----------------------------
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

    numeric_cols = [
        'Equity_Latest','LTP','MarketCap','NetProfit_FY','Dividend_FY',
        'High_52wk','Low_52wk','Price_Current','TTM_OPM','PE_FY','PriceToBook','CPS_FY'
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    return df

# -----------------------------
# Login Page
# -----------------------------
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

# -----------------------------
# Dashboard
# -----------------------------
def dashboard():
    df = load_clean_data()
    
    # -----------------------------
    # Sidebar Navigation
    # -----------------------------
    st.sidebar.title(f"Welcome, {st.session_state.username}")
    nav_options = ["Portfolio", "Watchlist", "Query Analysis"]
    choice = st.sidebar.radio("Navigate", nav_options, index=nav_options.index(st.session_state.nav))
    st.session_state.nav = choice

    if st.sidebar.button("⬅ Logout"):
        st.session_state.logged_in = False
        st.session_state.username = ""
        st.experimental_rerun()

    # -----------------------------
    # Light Background + Container
    # -----------------------------
    st.markdown("""
        <style>
        .stApp { background-color: light blue; }
        </style>
    """, unsafe_allow_html=True)

    # -----------------------------
    # Portfolio Tab
    # -----------------------------
    if st.session_state.nav == "Portfolio":
        st.subheader("📊 Portfolio Overview (All Stocks)")

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Total Market Cap", f"{df['MarketCap'].sum():,.0f}")
        c2.metric("Avg Price", f"{df['LTP'].mean():.2f}")
        c3.metric("Total Net Profit", f"{df['NetProfit_FY'].sum():,.0f}")
        c4.metric("Avg Dividend %", f"{df['Dividend_FY'].mean():.2f}")

        df_sorted = df.sort_values("TTM_OPM", ascending=False)

        fig = go.Figure(go.Candlestick(
            x=df_sorted['StockName'],
            open=df_sorted['Price_Current'],
            high=df_sorted['High_52wk'],
            low=df_sorted['Low_52wk'],
            close=df_sorted['LTP'],
            increasing_line_color='green',
            decreasing_line_color='red'
        ))

        fig.add_bar(
            x=df_sorted['StockName'],
            y=df_sorted['TTM_OPM'],
            marker_color=['green' if x >= 0 else 'red' for x in df_sorted['TTM_OPM']],
            yaxis="y2",
            opacity=0.3,
            name="Profit Margin %"
        )

        fig.update_layout(
            height=600,
            xaxis_tickangle=-45,
            yaxis2=dict(overlaying="y", side="right", title="Profit Margin %"),
            title="All Stocks Candlestick + Profit Margin",
            template="plotly_white"
        )

        st.plotly_chart(fig, use_container_width=True)

    # -----------------------------
    # Watchlist Tab
    # -----------------------------
    elif st.session_state.nav == "Watchlist":
        st.subheader("👁 Watchlist – Deep Stock Comparison")

        industries = sorted(df['Industry'].dropna().unique())
        selected_ind = st.selectbox("Select Industry", industries)
        watch_df = df[df['Industry'] == selected_ind]

        st.markdown(f"### 📊 Industry Overview: **{selected_ind}**")

        # ---- 1️⃣ LINE CHART - Price Trend
        fig_price = go.Figure()
        for stock in watch_df['StockName'].unique():
            stock_df = watch_df[watch_df['StockName'] == stock]
            fig_price.add_trace(go.Scatter(
                x=stock_df['LatestQuarterDate'],
                y=stock_df['LTP'],
                mode='lines+markers',
                name=stock,
                line=dict(width=3),
                marker=dict(size=6)
            ))
        fig_price.update_layout(
            height=450, xaxis_title="Quarter", yaxis_title="Price",
            hovermode="x unified", legend_title="Stock", template="plotly_white"
        )
        st.plotly_chart(fig_price, use_container_width=True)

        # ---- 2️⃣ Market Cap
        fig_mcap = go.Figure(go.Bar(
            x=watch_df['StockName'],
            y=watch_df['MarketCap'],
            text=watch_df['MarketCap'],
            textposition='auto'
        ))
        fig_mcap.update_layout(height=400, xaxis_title="Stock", yaxis_title="Market Cap", template="plotly_white")
        st.plotly_chart(fig_mcap, use_container_width=True)

        # ---- 3️⃣ Profit Margin
        colors = ['green' if x >= 0 else 'red' for x in watch_df['TTM_OPM']]
        fig_profit = go.Figure(go.Bar(
            x=watch_df['StockName'],
            y=watch_df['TTM_OPM'],
            marker_color=colors,
            text=watch_df['TTM_OPM'],
            textposition='auto'
        ))
        fig_profit.update_layout(height=400, xaxis_title="Stock", yaxis_title="Profit Margin (%)", template="plotly_white")
        st.plotly_chart(fig_profit, use_container_width=True)

        # ---- 4️⃣ Pie Chart
        profit_pie = watch_df.groupby('StockName')['TTM_OPM'].mean()
        fig_pie = go.Figure(go.Pie(labels=profit_pie.index, values=profit_pie.values, hole=0.4))
        fig_pie.update_layout(height=400)
        st.plotly_chart(fig_pie, use_container_width=True)

        # ---- 5️⃣ 52W High vs Low
        fig_range = go.Figure()
        fig_range.add_bar(x=watch_df['StockName'], y=watch_df['High_52wk'], name='52W High')
        fig_range.add_bar(x=watch_df['StockName'], y=watch_df['Low_52wk'], name='52W Low')
        fig_range.update_layout(barmode='group', height=400, template="plotly_white")
        st.plotly_chart(fig_range, use_container_width=True)

        # ---- 6️⃣ Radar Chart
        ratio_cols = ['PE_FY','PriceToBook','CPS_FY']
        fig_radar = go.Figure()
        for stock in watch_df['StockName'].unique():
            row = watch_df[watch_df['StockName']==stock].iloc[0]
            fig_radar.add_trace(go.Scatterpolar(
                r=[row[col] if not math.isnan(row[col]) else 0 for col in ratio_cols],
                theta=ratio_cols,
                fill='toself',
                name=stock
            ))
        fig_radar.update_layout(polar=dict(radialaxis=dict(visible=True)), height=500, showlegend=True)
        st.plotly_chart(fig_radar, use_container_width=True)

    # -----------------------------
    # Query Analysis Tab
    # -----------------------------
    elif st.session_state.nav == "Query Analysis":
        st.subheader("🤖 AI Query Analysis")
        st.info("Ask questions powered by FAISS + LLM")

        query = st.text_area("Your Query")
        if st.button("Run Query"):
            if not query.strip():
                st.warning("Enter a query")
            else:
                try:
                    r = requests.post("http://127.0.0.1:5000/query", json={"query": query}, timeout=30)
                    data = r.json()
                    st.success("Analysis Generated")
                    st.markdown("### 🧠 Answer")
                    st.write(data.get("analysis") or data.get("answer") or "No response")
                    results = data.get("results", [])
                    if results:
                        st.markdown("### 📈 Related Stocks")
                        for res in results:
                            st.write(f"- {res.get('stock_name','N/A')}")
                except Exception as e:
                    st.error("Query failed")
                    st.code(str(e))

# -----------------------------
# Main
# -----------------------------
if not st.session_state.logged_in:
    login()
else:
    dashboard()
