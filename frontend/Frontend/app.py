import streamlit as st

# ----------------------
# Session state initialization
# ----------------------
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "username" not in st.session_state:
    st.session_state.username = ""

# ----------------------
# Show dashboard if already logged in
# ----------------------
if st.session_state.logged_in:
    st.title(f"Welcome, {st.session_state.username}!")
    # Import dashboard code directly or call function
    import dashboard  # make sure dashboard.py has Streamlit code inside main
else:
    # ----------------------
    # Login page
    # ----------------------
    st.title("Login")
    username = st.text_input("Username")
    password = st.text_input("Password", type="password")

    if st.button("Login"):
        if username == "srishitha0616@gmail.com" and password == "Rishi@05":
            st.session_state.logged_in = True
            st.session_state.username = username
            st.experimental_rerun() if hasattr(st, "experimental_rerun") else None
        else:
            st.error("Invalid username or password")
