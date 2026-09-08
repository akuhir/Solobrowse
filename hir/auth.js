// Authentication Module — now backed by the centralized AKUM Portal API.
// No student credentials are hardcoded here. The backend is the source of
// truth for identity, department, and role.
class Auth {
    constructor() {
        this.currentUser = localStorage.getItem('currentUser');
        this.initializeLoginPage();
    }

    initializeLoginPage() {
        // Redirect to home if already logged in
        if (this.currentUser && !window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }

        if (document.getElementById('loginForm')) {
            this.setupLoginForm();
            this.setupThemeToggle();
        }
    }

    setupLoginForm() {
        const form = document.getElementById('loginForm');
        const matricInput = document.getElementById('matricNumber');
        const nameInput = document.getElementById('studentName');
        const rememberCheckbox = document.getElementById('rememberMe');

        matricInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login(matricInput.value, nameInput.value, rememberCheckbox.checked);
        });
    }

    async login(matric, password, rememberMe = false) {
        this.clearErrors();

        if (!matric.trim()) {
            this.showError('matricError', 'Please enter your matric number');
            return;
        }

        if (!password || !password.trim()) {
            this.showError('nameError', 'Please enter your password');
            return;
        }

        const submitBtn = document.querySelector('.login-btn');
        const originalBtnText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';
        }

        try {
            const response = await fetch(`${window.AKUM_API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricNo: matric.trim(), password: password.trim() }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                this.showError('matricError', data.message || 'Invalid matric number or password.');
                return;
            }

            // Login successful — store session details.
            localStorage.setItem('currentUser', data.user.matricNo);
            localStorage.setItem('currentUserName', data.user.name);
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userRole', data.user.role);
            localStorage.setItem('userDepartment', data.user.department);

            if (rememberMe) {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30);
                localStorage.setItem('loginExpiry', expiryDate.getTime());
            } else {
                localStorage.removeItem('loginExpiry');
            }

            this.showSuccessAnimation();
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        } catch (err) {
            console.error('Login request failed:', err);
            this.showError('matricError', 'Could not reach the server. Please check your connection and try again.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearErrors() {
        const errors = document.querySelectorAll('.error-message');
        errors.forEach(error => {
            error.textContent = '';
            error.classList.remove('show');
        });
    }

    showSuccessAnimation() {
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.style.opacity = '0.8';
            loginCard.style.transform = 'scale(0.98)';
        }
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggleLogin');
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.textContent = isDark ? '☀️' : '🌙';
        });
    }

    logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUserName');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userDepartment');
        window.location.href = 'login.html';
    }

    getCurrentUser() {
        return localStorage.getItem('currentUser');
    }

    isLoggedIn() {
        return !!localStorage.getItem('currentUser');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.auth = new Auth();
});
