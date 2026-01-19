// Registration function
async function register() {
  const username = document.getElementById('username');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const msg = document.getElementById('msg');
  
  // Clear previous messages
  msg.innerText = '';
  msg.className = '';
  
  if (!username.value || !email.value || !password.value) {
    msg.innerText = 'All fields are required.';
    return;
  }
  
  // Show loading state
  const submitBtn = document.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerText;
  submitBtn.innerText = 'Registering...';
  submitBtn.disabled = true;
  
  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, email: email.value, password: password.value })
    });
    const data = await res.json();
    if (res.ok) {
      msg.className = 'success';
      msg.innerText = 'OTP sent! Redirecting to verification...';
      sessionStorage.setItem('email', email.value);
      setTimeout(() => { window.location.href = '/verify-page'; }, 1000);
    } else {
      msg.innerText = data.detail || 'Registration failed. Please try again.';
    }
  } catch (error) {
    msg.innerText = 'Network error. Please check your connection and try again.';
  } finally {
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
}

// OTP verification function
async function verifyOtp() {
  const email = document.getElementById('email');
  const otp = document.getElementById('otp');
  const msg = document.getElementById('msg');
  
  // Clear previous messages
  msg.innerText = '';
  msg.className = '';
  
  if (!otp.value) {
    msg.innerText = 'Please enter the OTP.';
    return;
  }
  
  if (!email.value) {
    msg.innerText = 'Email not found. Please register again.';
    return;
  }
  
  // Show loading state
  const submitBtn = document.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerText;
  submitBtn.innerText = 'Verifying...';
  submitBtn.disabled = true;
  
  try {
    const res = await fetch('/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, otp: otp.value })
    });
    const data = await res.json();
    if (res.ok) {
      msg.className = 'success';
      msg.innerText = 'Verification successful! Redirecting to dashboard...';
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_email', email.value);
      sessionStorage.setItem('just_registered', 'true');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1000);
    } else {
      msg.innerText = data.detail || 'Invalid OTP. Please try again.';
    }
  } catch (error) {
    msg.innerText = 'Network error. Please check your connection and try again.';
  } finally {
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
}
async function login() {
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const msg = document.getElementById('msg');
  
  // Clear previous messages
  msg.innerText = '';
  msg.className = '';
  
  // Validate inputs
  if (!email.value || !password.value) {
    msg.innerText = 'Please enter both email and password.';
    return;
  }
  
  // Show loading state
  const submitBtn = document.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerText;
  submitBtn.innerText = 'Logging in...';
  submitBtn.disabled = true;
  
  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        password: password.value
      })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      msg.className = 'success';
      msg.innerText = 'Login successful! Redirecting...';
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_email', email.value);
      setTimeout(() => { location.href = "/dashboard"; }, 500);
    } else {
      msg.innerText = data.detail || "Invalid email or password. Please try again.";
    }
  } catch (error) {
    msg.innerText = "Network error. Please check your connection and try again.";
  } finally {
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
}

// stockChart variable is declared in dashboard.html, don't redeclare here
async function loadCompany() {
  const symbol = document.getElementById('symbol');
  const output = document.getElementById('output');
  if (!symbol.value) { output.innerText = 'Enter a symbol.'; return; }
  const r = await fetch(`/api/company/${symbol.value}`);
  if (r.ok) {
    const data = await r.json();
    output.innerText = '';
    // Remove old chart if exists
    if (stockChart) { stockChart.destroy(); }
    // Prepare data for chart
    const labels = ['Prev Close', 'Open', 'High', 'Low', 'Last', 'Close', 'VWAP', 'Volume'];
    const values = [
      Number(data['prev close']),
      Number(data['open']),
      Number(data['high']),
      Number(data['low']),
      Number(data['last']),
      Number(data['close']),
      Number(data['vwap']),
      Number(data['volume'])
    ];
    // Create canvas for chart
    let chartDiv = document.getElementById('stockChartDiv');
    if (!chartDiv) {
      chartDiv = document.createElement('div');
      chartDiv.id = 'stockChartDiv';
      output.parentNode.insertBefore(chartDiv, output.nextSibling);
    }
    chartDiv.innerHTML = '<canvas id="stockChart" style="max-width:600px;background:#fff;border-radius:8px;"></canvas>';
    const ctx = document.getElementById('stockChart').getContext('2d');
    stockChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: symbol.value.toUpperCase() + ' Details',
          data: values,
          backgroundColor: '#4f46e5',
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  } else {
    output.innerText = 'Not found.';
    if (stockChart) { stockChart.destroy(); }
    let chartDiv = document.getElementById('stockChartDiv');
    if (chartDiv) chartDiv.innerHTML = '';
  }
}

async function sendChat() {
  const chatInput = document.getElementById('chatInput');
  const chatHistory = document.getElementById('chatHistory');
  
  if (!chatInput.value.trim()) {
    return;
  }

  const userMessage = chatInput.value.trim();
  chatInput.value = '';

  // Add user message
  addChatMessage(userMessage, 'user');

  // Add loading indicator
  const loadingId = 'loading-' + Date.now();
  addChatMessage('Thinking...', 'bot', loadingId);

  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({ message: userMessage })
    });

    // Remove loading message
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) loadingElement.remove();

    if (!r.ok) {
      addChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
      return;
    }

    const d = await r.json();
    addChatMessage(d.reply, 'bot');
  } catch (err) {
    // Remove loading message
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) loadingElement.remove();
    
    addChatMessage('Sorry, I encountered an error: ' + err.message, 'bot');
  }
}

function addChatMessage(message, type, id) {
  const chatHistory = document.getElementById('chatHistory');
  const messageDiv = document.createElement('div');
  if (id) messageDiv.id = id;
  
  messageDiv.style.cssText = `
    margin: 10px 0;
    padding: 14px 18px;
    border-radius: 12px;
    max-width: 80%;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transition: transform 0.2s;
    ${type === 'user' ? 
      'background: linear-gradient(135deg, #667eea, #764ba2); color: white; margin-left: auto; text-align: right;' : 
      'background: white; color: #1f2937; border: 2px solid #e5e7eb;'}
  `;
  
  // Add hover effect
  messageDiv.onmouseover = () => messageDiv.style.transform = 'scale(1.02)';
  messageDiv.onmouseout = () => messageDiv.style.transform = 'scale(1)';
  
  messageDiv.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 8px; font-size: 0.9rem; color: ${type === 'user' ? 'rgba(255,255,255,0.9)' : '#667eea'};">
      ${type === 'user' ? '👤 You' : '🤖 AI Assistant'}
    </div>
    <div style="white-space: pre-wrap; word-wrap: break-word; line-height: 1.6;">${message}</div>
  `;
  
  chatHistory.appendChild(messageDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function clearChat() {
  const chatHistory = document.getElementById('chatHistory');
  chatHistory.innerHTML = `
    <div style="color: #6b7280; text-align: center; padding: 25px; animation: fadeIn 0.5s;">
      <div style="font-size: 3rem; margin-bottom: 15px; animation: float 3s ease-in-out infinite;">🤖</div>
      <p style="font-size: 1.2rem; margin-bottom: 15px; font-weight: 600; color: #1f2937;">👋 Hi! I'm your AI stock assistant</p>
      <p style="font-size: 1rem; margin-bottom: 15px;">Ask me questions like:</p>
      <ul style="text-align: left; margin-top: 15px; list-style: none; padding: 0; max-width: 400px; margin-left: auto; margin-right: auto;">
        <li style="margin: 8px 0; padding: 8px 12px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">• "What are the top performing stocks today?"</li>
        <li style="margin: 8px 0; padding: 8px 12px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">• "Tell me about Reliance stock"</li>
        <li style="margin: 8px 0; padding: 8px 12px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">• "Which stocks have high P/E ratios?"</li>
      </ul>
    </div>
  `;
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  sessionStorage.clear();
  window.location.href = '/login';
}
