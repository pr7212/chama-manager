const registerForm = document.getElementById('registerForm');

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    console.log('REGISTER SUBMIT FIRED');
    e.preventDefault();

    const full_name = document.getElementById('full_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();
    const button = registerForm.querySelector('button');

    if (!full_name || !phone || !password) {
      alert('All fields are required');
      return;
    }

    // Add debug log as per Phase 3, Step 3
    console.log('Register clicked with: ', { full_name, phone });

    button.innerText = 'Registering...';
    button.disabled = true;

    try {
      const response = await fetch(`${CONFIG.API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name,
          phone,
          password,
        }),
      });

      const data = await response.json();
      console.log('Register response:', data);

      if (response.ok && data.success) {
        // As per Phase 2, standardise storage and redirect
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        alert('Registration successful');
        window.location.href = 'dashboard.html';
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Register error:', error);
      alert('Network error');
    } finally {
      button.innerText = 'Register';
      button.disabled = false;
    }
  });
}
