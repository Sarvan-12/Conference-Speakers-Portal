class ConferenceSchedule {
    constructor() {
        this.scheduleData = [];
        this.hallsData = [];
        this.speakersData = [];
        this.timeSlotsData = [];
        this.currentHall = null;
        this.currentDay = 1;
        this.currentConferenceId = 1;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Conference Schedule App...');
        await this.loadData();
        this.setupEventListeners();
        this.displaySchedule();
    }

    async loadData() {
        try {
            // Show loading state
            document.getElementById('loading').classList.remove('hidden');
            document.getElementById('schedule-container').classList.add('hidden');
            document.getElementById('error').classList.add('hidden');

            console.log('📊 Loading conference data...');

            // Fetch all required data
            const [hallsResponse, scheduleResponse, speakersResponse, timeSlotsResponse] = await Promise.all([
                fetch(`/api/halls?conference_id=${this.currentConferenceId}`),
                fetch(`/api/schedule?conference_id=${this.currentConferenceId}`),
                fetch('/api/speakers'),
                fetch(`/api/timeslots?conference_id=${this.currentConferenceId}`)
            ]);

            // Check if all requests were successful
            if (!hallsResponse.ok || !scheduleResponse.ok || !speakersResponse.ok || !timeSlotsResponse.ok) {
                throw new Error('Failed to fetch conference data');
            }

            // Parse JSON data
            this.hallsData = await hallsResponse.json();
            this.scheduleData = await scheduleResponse.json();
            this.speakersData = await speakersResponse.json();
            this.timeSlotsData = await timeSlotsResponse.json();

            console.log('✅ Data loaded successfully:', {
                halls: this.hallsData.length,
                schedules: this.scheduleData.length,
                speakers: this.speakersData.length,
                timeSlots: this.timeSlotsData.length
            });

            // Set default hall if not set
            if (!this.currentHall && this.hallsData.length > 0) {
                this.currentHall = this.hallsData[0].hall_id;
            }

            // Create hall navigation
            this.createHallNavigation();
            this.renderSpeakersDirectory();

            // Hide loading, show content
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('schedule-container').classList.remove('hidden');

        } catch (error) {
            console.error('❌ Error loading data:', error);
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('error').classList.remove('hidden');
        }
    }

    createHallNavigation() {
        const hallNav = document.getElementById('hall-nav');
        hallNav.innerHTML = '';

        this.hallsData.forEach((hall, index) => {
            const button = document.createElement('button');
            button.className = `hall-btn ${index === 0 ? 'active' : ''}`;
            button.dataset.hallId = hall.hall_id;
            button.innerHTML = `
                📍 ${hall.hall_name}
                <span class="capacity">(${hall.capacity} seats)</span>
            `;
            
            button.addEventListener('click', () => {
                this.switchHall(hall.hall_id);
            });
            
            hallNav.appendChild(button);
        });
    }

    setupEventListeners() {
        // Day tabs
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchDay(parseInt(e.target.dataset.day));
            });
        });

        // Modal close events
        const modal = document.getElementById('speaker-modal');
        
        // Close button
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    switchHall(hallId) {
        this.currentHall = parseInt(hallId);
        
        // Update active hall button
        document.querySelectorAll('.hall-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.hallId) === this.currentHall) {
                btn.classList.add('active');
            }
        });

        // Update hall details
        const hallData = this.hallsData.find(h => h.hall_id === this.currentHall);
        if (hallData) {
            document.getElementById('hall-title').textContent = `${hallData.hall_name} Schedule`;
            document.getElementById('hall-details').textContent = 
                `${hallData.location} • Capacity: ${hallData.capacity} attendees`;
        }

        this.displaySchedule();
        this.updateStats();
    }

    switchDay(dayNumber) {
        this.currentDay = dayNumber;
        
        // Update active day tab
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.classList.remove('active');
            if (parseInt(tab.dataset.day) === dayNumber) {
                tab.classList.add('active');
            }
        });

        this.displaySchedule();
        this.updateStats();
    }

    displaySchedule() {
        const scheduleGrid = document.getElementById('schedule-grid');
        
        // Filter schedule for current hall and day
        const filteredSchedule = this.scheduleData.filter(item => 
            item.hall_id === this.currentHall && 
            item.day_number === this.currentDay
        );

        if (filteredSchedule.length === 0) {
            scheduleGrid.innerHTML = `
                <div class="empty-state">
                    <h3>📅 No Sessions Scheduled</h3>
                    <p>No sessions are currently scheduled for ${this.getCurrentHallName()} on Day ${this.currentDay}</p>
                    <p style="margin-top: 10px; font-size: 0.9rem; color: #718096;">
                        Check other days or halls for available sessions.
                    </p>
                </div>
            `;
            return;
        }

        // Sort by slot order (time)
        filteredSchedule.sort((a, b) => a.slot_order - b.slot_order);

        // Generate HTML
        scheduleGrid.innerHTML = filteredSchedule.map((session, index) => `
            <div class="time-slot" style="animation-delay: ${index * 0.1}s">
                <div class="time-info">
                    <div class="time-range">
                        ${this.formatTime(session.start_time)} - ${this.formatTime(session.end_time)}
                    </div>
                    <div class="slot-name">${session.slot_name}</div>
                </div>
                <div class="speaker-info">
                    <div class="speaker-name" onclick="app.showSpeakerModal(${session.speaker_id})">
                        ${session.speaker_name}
                    </div>
                    <div class="speaker-title">${session.speaker_title}</div>
                    ${session.session_title ? `<div class="session-title">"${session.session_title}"</div>` : ''}
                    <div class="speaker-meta">
                        <span>👤 ${session.speaker_code}</span>
                        <span>📍 ${session.hall_name}</span>
                        <span>📅 Day ${session.day_number}</span>
                        <span>⏰ ${this.getSessionDuration(session.start_time, session.end_time)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
    // Count sessions for current hall and day
    const currentSessions = this.scheduleData.filter(item => 
        item.hall_id === this.currentHall && 
        item.day_number === this.currentDay
    );

    // Get current hall capacity
    const currentHallData = this.hallsData.find(h => h.hall_id === this.currentHall);

    // Update stats display
    document.getElementById('total-sessions').textContent = currentSessions.length;
    document.getElementById('current-hall-capacity').textContent = currentHallData ? currentHallData.capacity : '-';
    // Show total speakers in the conference
    document.getElementById('unique-speakers').textContent = this.speakersData.length;
}
    renderSpeakersDirectory() {
   const speakersList = document.getElementById('speakers-list');
    if (!speakersList) return;
    if (!this.speakersData || this.speakersData.length === 0) {
        speakersList.innerHTML = '<p>No speakers found.</p>';
        return;
    }
    speakersList.innerHTML = this.speakersData.map(speaker => `
        <div class="speaker-card-dir" onclick="app.showSpeakerModal(${speaker.speaker_id})">
            <div class="speaker-card-header">
                <div class="speaker-name">${speaker.full_name}</div>

            </div>
            <div class="speaker-title">${speaker.title || ''}</div>
            <div class="speaker-meta">${speaker.email || ''}</div>
        </div>
    `).join('');
}

    formatTime(timeString) {
        // Convert 24h format to 12h format
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    getSessionDuration(startTime, endTime) {
        const start = new Date(`2000-01-01 ${startTime}`);
        const end = new Date(`2000-01-01 ${endTime}`);
        const durationMs = end - start;
        const durationMinutes = durationMs / (1000 * 60);
        
        if (durationMinutes >= 60) {
            const hours = Math.floor(durationMinutes / 60);
            const minutes = durationMinutes % 60;
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        return `${durationMinutes}m`;
    }

    getCurrentHallName() {
        const hall = this.hallsData.find(h => h.hall_id === this.currentHall);
        return hall ? hall.hall_name : 'Unknown Hall';
    }

    async showSpeakerModal(speakerId) {
        try {
            console.log(`🔍 Loading speaker details for ID: ${speakerId}`);
            
            // Find speaker in loaded data first
            let speaker = this.speakersData.find(s => s.speaker_id === parseInt(speakerId));
            
            if (!speaker) {
                // Fallback to API call
                const response = await fetch(`/api/speaker/${speakerId}`);
                if (!response.ok) throw new Error('Failed to fetch speaker details');
                speaker = await response.json();
            }
            
            // Get speaker's sessions
            const speakerSessions = this.scheduleData.filter(s => s.speaker_id === parseInt(speakerId));
            
            // Populate modal
            document.getElementById('modal-speaker-name').textContent = speaker.full_name || speaker.speaker_name;
            document.getElementById('modal-speaker-code').textContent = speaker.speaker_code;
            document.getElementById('modal-speaker-title').textContent = speaker.title || speaker.speaker_title;
            document.getElementById('modal-speaker-bio').textContent = speaker.bio || speaker.speaker_bio || 'No biography available.';
            document.getElementById('modal-speaker-email').textContent = speaker.email;
            document.getElementById('modal-speaker-phone').textContent = speaker.phone || 'Not provided';
            
            // Display speaker sessions
            const sessionsContainer = document.getElementById('speaker-sessions-list');
            if (speakerSessions.length > 0) {
                sessionsContainer.innerHTML = speakerSessions.map(session => `
                    <div class="session-item">
                        <strong>${session.session_title || 'Untitled Session'}</strong>
                        <span>Day ${session.day_number} • ${this.formatTime(session.start_time)} - ${this.formatTime(session.end_time)} • ${session.hall_name}</span>
                    </div>
                `).join('');
            } else {
                sessionsContainer.innerHTML = '<p style="color: #718096;">No sessions scheduled for this speaker.</p>';
            }
            
            // Show modal
            document.getElementById('speaker-modal').classList.remove('hidden');
            
        } catch (error) {
            console.error('❌ Error loading speaker details:', error);
            alert('Failed to load speaker details. Please try again.');
        }
    }

    closeModal() {
        document.getElementById('speaker-modal').classList.add('hidden');
    }

    // Utility method for debugging
    logCurrentState() {
        console.log('Current State:', {
            hall: this.currentHall,
            day: this.currentDay,
            hallsLoaded: this.hallsData.length,
            schedulesLoaded: this.scheduleData.length
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Conference Schedule App Starting...');
    window.app = new ConferenceSchedule();
});

// Auto-refresh data every 5 minutes
setInterval(() => {
    if (window.app) {
        console.log('🔄 Auto-refreshing data...');
        window.app.loadData();
    }
}, 5 * 60 * 1000);

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.app) {
        console.log('👀 Page became visible, refreshing data...');
        window.app.loadData();
    }
});