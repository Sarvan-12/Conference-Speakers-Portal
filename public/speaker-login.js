class SpeakerLogin {
    constructor() {
        this.form = document.getElementById('speakerLoginForm');
        this.errorMessage = document.getElementById('errorMessage');
        this.init();
    }
    
    init() {
        this.form.addEventListener('submit', this.handleLogin.bind(this));
        
        // Auto-format speaker code input
        const codeInput = document.getElementById('speakerCode');
        codeInput.addEventListener('input', this.formatSpeakerCode.bind(this));
    }
    
    formatSpeakerCode(event) {
        let value = event.target.value.toUpperCase();
        // Remove non-alphanumeric characters
        value = value.replace(/[^A-Z0-9]/g, '');
        
        // Ensure SP prefix
        if (value && !value.startsWith('SP')) {
            if (value.match(/^\d/)) {
                value = 'SP' + value;
            }
        }
        
        event.target.value = value;
    }
    
    async handleLogin(event) {
        event.preventDefault();
        
        const speakerCode = document.getElementById('speakerCode').value.trim();
        
        if (!speakerCode) {
            this.showError('Please enter your speaker code');
            return;
        }
        
        // Validate format
        if (!speakerCode.match(/^SP\d{3}$/)) {
            this.showError('Speaker code must be in format: SP001, SP002, etc.');
            return;
        }
        
        this.setLoading(true);
        this.hideError();
        
        try {
            const response = await fetch(`/api/speaker/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ speakerCode })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store speaker info
                localStorage.setItem('speakerData', JSON.stringify(data));
                localStorage.setItem('speakerCode', speakerCode);
                
                // Redirect to dashboard
                window.location.href = 'speaker-dashboard.html';
            } else {
                this.showError(data.error || 'Invalid speaker code');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(isLoading) {
        const submitBtn = this.form.querySelector('.login-submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline';
            submitBtn.disabled = true;
        } else {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            submitBtn.disabled = false;
        }
    }
    
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }
    
    hideError() {
        this.errorMessage.style.display = 'none';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SpeakerLogin();
});