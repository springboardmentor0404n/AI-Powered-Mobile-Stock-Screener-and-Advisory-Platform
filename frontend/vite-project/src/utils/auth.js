export const saveToken = (token) => {
  localStorage.setItem("access_token", token);
};

export const getToken = () => {
  return localStorage.getItem("access_token");
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("access_token");
};

export const logout = () => {
  localStorage.removeItem("access_token");
  window.location.href = "/";
};
