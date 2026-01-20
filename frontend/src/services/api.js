const API_BASE = "http://127.0.0.1:8000";

async function apiRequest(path, method = "GET", body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(API_BASE + path, options);

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  return res.json();
}

export { apiRequest };
export default apiRequest;

export const buyStock = async (payload) => {
  const res = await fetch("http://127.0.0.1:8000/portfolio/buy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Buy request failed");
  }

  return res.json();
};
