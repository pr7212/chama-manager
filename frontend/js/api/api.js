const API_URL = CONFIG.API_URL;

function getApiToken() {
  return localStorage.getItem('token');
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = getApiToken();

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

  const resData = await response.json();

  if (!response.ok) {
    const err = new Error(resData.message || 'Request failed');
    err.status = response.status;
    err.data = resData;
    throw err;
  }

  // Automatically unwrap standard response envelop
  if (resData && typeof resData === 'object' && resData.success === true && 'data' in resData) {
    return resData.data;
  }

  return resData;
}
