const getCurrentUser = () => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const getToken = () => localStorage.getItem('token');

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
};

const requireAuth = () => {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

// Uses CONFIG.API_URL which is already "<origin>/api"
const authFetch = async (path, options = {}) => {
  try {
    const response = await fetch(`${CONFIG.API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${getToken()}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      logout();
      return null;
    }

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

window.Auth = {
  authFetch,
  getCurrentUser,
  getToken,
  logout,
  requireAuth,
};
