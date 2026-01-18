const API_BASE = "http://127.0.0.1:8001";

// Add event listener for Enter key in the question input
document.addEventListener('DOMContentLoaded', function() {
    const questionInput = document.getElementById('question');
    if (questionInput) {
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendQuestion();
            }
        });
    }
});

// Function to format the RAG response
function formatResponse(response) {
    // Convert newlines to <br> tags for proper HTML display
    return response.replace(/\n/g, '<br>');
}

/* ---------------- LOGIN ---------------- */
async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (!email || !password) return alert("Fill all fields");

    const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
        const err = await res.json();
        return alert(err.detail || "Login failed");
    }

    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    window.location.href = "/dashboard.html";
}

/* ---------------- REGISTER ---------------- */
async function register() {
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (!username || !email || !password) return alert("Fill all fields");

    const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
    });

    if (!res.ok) {
        const err = await res.json();
        return alert(err.detail || "Registration failed");
    }

    alert("Registered successfully! Welcome.");
    window.location.href = "login.html";
}

/* ---------------- CHAT ---------------- */
window.onload = () => {
    if (document.getElementById("chat-box")) {
        const token = localStorage.getItem("access_token");
        if (!token) {
            alert("Please login first");
            window.location.href = "login.html";
        }
        
        // Add welcome message
        const box = document.getElementById("chat-box");
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'message bot-message';
        welcomeMessage.innerHTML = `
            <div class="message-header">Assistant</div>
            <div>Welcome! Ask me anything about the stock market data. For example: "Which companies have high market cap?" or "Show me companies in the IT industry."</div>
        `;
        box.appendChild(welcomeMessage);
    }
};

async function sendQuestion() {
    const token = localStorage.getItem("access_token");
    const question = document.getElementById("question").value;
    if (!question.trim()) return alert("Please enter a question");

    // Show loading indicator
    const box = document.getElementById("chat-box");
    const userMessage = document.createElement('div');
    userMessage.className = 'message user-message';
    userMessage.innerHTML = `
        <div class="message-header">You</div>
        <div>${question}</div>
    `;
    box.appendChild(userMessage);

    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'message bot-message loading';
    loadingMessage.id = 'loading-message';
    loadingMessage.innerHTML = `
        <div class="message-header">Assistant</div>
        <div>Thinking...</div>
    `;
    box.appendChild(loadingMessage);

    box.scrollTop = box.scrollHeight;
    document.getElementById("question").value = "";

    try {
        const res = await fetch(`${API_BASE}/ask`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ question })
        });

        // Remove loading message
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.remove();

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Request failed");
        }

        const data = await res.json();
        
        const botMessage = document.createElement('div');
        botMessage.className = 'message bot-message';
        botMessage.innerHTML = `
            <div class="message-header">Assistant</div>
            <div>${formatResponse(data.answer)}</div>
        `;
        box.appendChild(botMessage);
        
        box.scrollTop = box.scrollHeight;
    } catch (error) {
        // Remove loading message
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.remove();
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'message bot-message';
        errorMessage.innerHTML = `
            <div class="message-header">Assistant</div>
            <div>Error: ${error.message}</div>
        `;
        box.appendChild(errorMessage);
        
        box.scrollTop = box.scrollHeight;
    }
}

/* ---------------- LOGOUT ---------------- */
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    }
}
