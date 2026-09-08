// Authentication Module — Social Studies Portal
//
// PLACEHOLDER AUTH: The real Social Studies student roster is not available yet.
// Until it is provided, this accepts any non-empty Matric Number + Name so the
// portal can be tested. Replace the login() method below with a real roster
// lookup (see /hir/auth.js for the pattern) once student data is supplied.
//
// Storage keys are suffixed with "_ss" so this portal's login session never
// collides with the H.I.R portal's session — both are served from the same
// GitHub Pages domain and localStorage is shared per-domain, not per-folder.
class Auth {
    constructor() {
        this.currentUser = localStorage.getItem('currentUser_ss');
        this.initializeLoginPage();
    }

    initializeLoginPage() {
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

    login(matric, nameInput, rememberMe = false) {
        this.clearErrors();

        if (!matric.trim()) {
            this.showError('matricError', 'Please enter your matric number');
            return;
        }

        if (!nameInput || !nameInput.trim()) {
            this.showError('nameError', 'Please enter any part of your name');
            return;
        }

        // PLACEHOLDER: no real roster yet — accept any matric + name.
        // Swap this block for a real lookup (like /hir/auth.js) once you
        // have the actual Social Studies class list.
        const enteredMatric = matric.trim().toUpperCase();
        const enteredName = nameInput.trim();

        localStorage.setItem('currentUser_ss', enteredMatric);
        localStorage.setItem('currentUserName_ss', enteredName);

        if (rememberMe) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            localStorage.setItem('loginExpiry_ss', expiryDate.getTime());
        } else {
            localStorage.removeItem('loginExpiry_ss');
        }

        this.showSuccessAnimation();
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
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
        localStorage.removeItem('currentUser_ss');
        localStorage.removeItem('currentUserName_ss');
        window.location.href = 'login.html';
    }

    getCurrentUser() {
        return localStorage.getItem('currentUser_ss');
    }

    isLoggedIn() {
        return !!localStorage.getItem('currentUser_ss');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.auth = new Auth();
});
