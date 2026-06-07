const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const phone = document.getElementById('phone').value.trim();

    const password = document.getElementById('password').value.trim();

    const button = loginForm.querySelector('button');

    if (!phone || !password) {
      alert('Phone and password required');
      return;
    }

    button.innerText = 'Logging in...';
    button.disabled = true;

    try {
      const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);

        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        alert('Login successful');

        window.location.href = 'dashboard.html';
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (error) {
      console.log(error);

      alert('Network error');
    } finally {
      button.innerText = 'Login';
      button.disabled = false;
    }
  });
}
