document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginSection = document.getElementById('loginSection');
    const content = document.getElementById('content');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // Check if user has a valid token
    const bearerToken = localStorage.getItem('adminBearerToken');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (bearerToken && expiresAt && new Date() < new Date(expiresAt)) {
        window.location.href = 'admin-dashboard.html';
    }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Hide any previous messages
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        fetch('/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    localStorage.setItem('adminBearerToken', data.bearerToken);
                    localStorage.setItem('tokenExpiresAt', data.expiresAt);

                    successMessage.textContent = 'Login successful!';
                    successMessage.style.display = 'block';
                    // Redirect to dashboard after short delay
                    setTimeout(() => {
                        window.location.href = 'admin-dashboard.html';
                    }, 1000);

                    loginForm.reset();
                } else {
                    errorMessage.textContent = data.error || 'Invalid credentials';
                    errorMessage.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                errorMessage.textContent = 'An error occurred. Please try again.';
                errorMessage.style.display = 'block';
            });
    });
});
