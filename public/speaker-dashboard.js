class SpeakerDashboard {
    constructor() {
        this.speakerData = null;
        this.scheduleData = [];
        this.init();
    }

    init() {
        // Check authentication
        this.checkAuth();
        // Load data
        this.loadSpeakerData();
    }

    checkAuth() {
        const speakerData = localStorage.getItem('speakerData');
        const speakerCode = localStorage.getItem('speakerCode');
        
        if (!speakerData || !speakerCode) {
            // Redirect to login
            window.location.href = 'speaker-login.html';
            return;
        }

        try {
            this.speakerData = JSON.parse(speakerData);
        } catch (error) {
            console.error('Invalid speaker data:', error);
            window.location.href = 'speaker-login.html';
        }
    }

    loadSpeakerData() {
        if (!this.speakerData) return;
        
        // Update header
        this.updateHeader();
        
        // Update stats
        this.updateStats();
        
        // Display schedule
        this.displaySchedule();
        
        // Display profile
        this.displayProfile();
    }

    updateHeader() {
        const speakerName = document.getElementById('speakerName');
        const speakerCode = document.getElementById('speakerCode');
        
        if (speakerName && this.speakerData.speaker) {
            speakerName.textContent = `Welcome, ${this.speakerData.speaker.full_name}`;
        }
        
        if (speakerCode && this.speakerData.speaker) {
            speakerCode.textContent = `Speaker ID: ${this.speakerData.speaker.speaker_code}`;
        }
    }

    updateStats() {
        const totalSessions = document.getElementById('totalSessions');
        const totalUploads = document.getElementById('totalUploads');
        const pendingUploads = document.getElementById('pendingUploads');
        
        if (totalSessions) {
            totalSessions.textContent = this.speakerData.total_sessions || 0;
        }
        
        if (totalUploads) {
            // For now, set to 0 - will be updated when file upload is implemented
            totalUploads.textContent = '0';
        }
        
        if (pendingUploads) {
            // All sessions are pending uploads for now
            pendingUploads.textContent = this.speakerData.total_sessions || 0;
        }
    }

    displaySchedule() {
        const container = document.getElementById('scheduleContainer');
        
        if (!container || !this.speakerData.schedule) return;
        
        if (this.speakerData.schedule.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: white;">
                    <p style="font-size: 18px;">No sessions scheduled yet.</p>
                    <p style="font-size: 14px; margin-top: 10px; opacity: 0.8;">Your schedule will appear here once assigned by the organizers.</p>
                </div>
            `;
            return;
        }
        
        let scheduleHTML = '';
        
        this.speakerData.schedule.forEach((session) => {
            const dayName = this.getDayName(session.day_number);
            const timeFormatted = this.formatTime(session.start_time) + ' - ' + this.formatTime(session.end_time);
            
            scheduleHTML += `
                <div class="schedule-item">
                    <div class="schedule-header">
                        <div class="session-info">
                            <h3>${session.session_title}</h3>
                            <div class="session-details">
                                <div class="detail-item">
                                    <span>📅</span>
                                    <span>${dayName}</span>
                                </div>
                                <div class="detail-item">
                                    <span>🕐</span>
                                    <span>${timeFormatted}</span>
                                </div>
                                <div class="detail-item">
                                    <span>🏛️</span>
                                    <span>${session.hall_name}</span>
                                </div>
                                <div class="detail-item">
                                    <span>👥</span>
                                    <span>${session.capacity} seats</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="upload-section">
                        <p style="font-size: 12px; color: #718096; margin-bottom: 10px;">
                            Upload your presentation for this session (Coming Soon)
                        </p>
                        <button class="upload-btn" onclick="alert('File upload feature coming in Phase 2!')">
                            📎 Upload Presentation
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = scheduleHTML;
    }

    displayProfile() {
        if (!this.speakerData.speaker) return;
        
        const speaker = this.speakerData.speaker;
        
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profilePhone = document.getElementById('profilePhone');
        const profileTitle = document.getElementById('profileTitle');
        const profileBio = document.getElementById('profileBio');
        
        if (profileName) profileName.textContent = speaker.full_name || 'Not provided';
        if (profileEmail) profileEmail.textContent = speaker.email || 'Not provided';
        if (profilePhone) profilePhone.textContent = speaker.phone || 'Not provided';
        if (profileTitle) profileTitle.textContent = speaker.title || 'Not provided';
        if (profileBio) profileBio.textContent = speaker.bio || 'No biography provided';
    }

    getDayName(dayNumber) {
        const days = ['', 'Day 1', 'Day 2', 'Day 3', 'Day 4'];
        return days[dayNumber] || `Day ${dayNumber}`;
    }

    formatTime(timeString) {
        if (!timeString) return '';
        
        try {
            // Handle time format from database (HH:MM:SS)
            const [hours, minutes] = timeString.split(':');
            const hour24 = parseInt(hours);
            const hour12 = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
            const ampm = hour24 >= 12 ? 'PM' : 'AM';
            
            return `${hour12}:${minutes} ${ampm}`;
        } catch (error) {
            return timeString;
        }
    }
}

// Global logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('speakerData');
        localStorage.removeItem('speakerCode');
        window.location.href = 'speaker-login.html';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SpeakerDashboard();
});