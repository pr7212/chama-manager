const API_BASE_URL = typeof CONFIG !== 'undefined'
  ? CONFIG.API_URL.replace(/\/api$/, '')
  : window.location.origin;

const getToken = () => localStorage.getItem('token');

const getCurrentUser = () => {
  const storedUser = localStorage.getItem('user');

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch (error) {
    localStorage.removeItem('user');
    return null;
  }
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
};

const requireAuth = () => {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
};

const authFetch = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    logout();
    return null;
  }

  return response;
};

window.Auth = {
  apiBaseUrl: API_BASE_URL,
  authFetch,
  getCurrentUser,
  getToken,
  logout,
  requireAuth,
};
