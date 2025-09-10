// Configuración y variables globales
const CONFIG = {
    minPasswordLength: 6,
    apiEndpoint: 'https://api.sistemaestudiantil.com/auth/login', // URL de ejemplo
    redirectDelay: 1500
};

// Utilidades
const Utils = {
    // Validar formato de email
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Mostrar mensaje al usuario
    showMessage: (message, type = 'error') => {
        // Eliminar mensajes existentes
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // Crear nuevo mensaje
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const icon = type === 'error' ? 
            '<i class="fas fa-exclamation-circle"></i>' : 
            '<i class="fas fa-check-circle"></i>';
            
        messageDiv.innerHTML = `${icon} ${message}`;
        
        // Insertar después del formulario
        const form = document.getElementById('loginForm');
        form.parentNode.insertBefore(messageDiv, form.nextSibling);
        
        // Auto-eliminación después de 5 segundos para mensajes de éxito
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    },
    
    // Simular llamada a API
    simulateApiCall: (credentials) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulación: credenciales válidas si el password tiene al menos 6 caracteres
                if (credentials.password.length >= CONFIG.minPasswordLength) {
                    resolve({
                        success: true,
                        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        user: {
                            id: 1,
                            name: 'Usuario Ejemplo',
                            email: credentials.email
                        }
                    });
                } else {
                    reject({
                        success: false,
                        message: 'Credenciales inválidas. Por favor, verifica tu email y contraseña.'
                    });
                }
            }, 1500); // Simular delay de red
        });
    }
};

// Manejo del formulario de login
const LoginForm = {
    init: function() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.originalButtonText = this.submitButton.innerHTML;
        
        this.bindEvents();
    },
    
    bindEvents: function() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Validación en tiempo real
        this.emailInput.addEventListener('blur', this.validateEmail.bind(this));
        this.passwordInput.addEventListener('blur', this.validatePassword.bind(this));
    },
    
    validateEmail: function() {
        const email = this.emailInput.value.trim();
        
        if (!email) {
            this.setFieldError(this.emailInput, 'El correo electrónico es requerido');
            return false;
        }
        
        if (!Utils.isValidEmail(email)) {
            this.setFieldError(this.emailInput, 'Por favor ingresa un correo electrónico válido');
            return false;
        }
        
        this.clearFieldError(this.emailInput);
        return true;
    },
    
    validatePassword: function() {
        const password = this.passwordInput.value;
        
        if (!password) {
            this.setFieldError(this.passwordInput, 'La contraseña es requerida');
            return false;
        }
        
        if (password.length < CONFIG.minPasswordLength) {
            this.setFieldError(this.passwordInput, `La contraseña debe tener al menos ${CONFIG.minPasswordLength} caracteres`);
            return false;
        }
        
        this.clearFieldError(this.passwordInput);
        return true;
    },
    
    setFieldError: function(field, message) {
        this.clearFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'mt-1 text-sm text-red-600';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
        field.classList.add('border-red-500');
    },
    
    clearFieldError: function(field) {
        const errorDiv = field.parentNode.querySelector('.text-red-600');
        if (errorDiv) {
            errorDiv.remove();
        }
        field.classList.remove('border-red-500');
    },
    
    setLoadingState: function(isLoading) {
        if (isLoading) {
            this.submitButton.disabled = true;
            this.submitButton.innerHTML = '<i class="fas fa-spinner loading mr-2"></i> Iniciando sesión...';
        } else {
            this.submitButton.disabled = false;
            this.submitButton.innerHTML = this.originalButtonText;
        }
    },
    
    handleSubmit: async function(e) {
        e.preventDefault();
        
        // Validar campos
        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        
        if (!isEmailValid || !isPasswordValid) {
            Utils.showMessage('Por favor, corrige los errores en el formulario.');
            return;
        }
        
        // Obtener valores
        const credentials = {
            email: this.emailInput.value.trim(),
            password: this.passwordInput.value
        };
        
        // Intentar login
        this.setLoadingState(true);
        
        try {
            const result = await Utils.simulateApiCall(credentials);
            
            if (result.success) {
                Utils.showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
                
                // Guardar token (en una aplicación real)
                localStorage.setItem('authToken', result.token);
                
                // Redirigir después de un delay
                setTimeout(() => {
                    window.location.href = '/dashboard'; // URL de destino
                }, CONFIG.redirectDelay);
            }
        } catch (error) {
            Utils.showMessage(error.message || 'Error al iniciar sesión. Intenta nuevamente.');
        } finally {
            this.setLoadingState(false);
        }
    }
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    LoginForm.init();
    
    // Opcional: Si hay credenciales guardadas, completar el formulario
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('remember-me').checked = true;
    }
});