const API_URL = CONFIG.API_URL;

function getToken() {
  return localStorage.getItem('token');
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = getToken();

  if (!token) {
    window.location.href = 'login.html';
    return null;
  }

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
