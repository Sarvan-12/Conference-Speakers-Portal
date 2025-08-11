class ConferenceAdmin {
    constructor() {
        this.halls = [];
        this.speakers = [];
        this.schedules = [];
        this.timeSlots = [];
        this.currentSection = 'speakers';
        this.init();
    }

    async init() {
        console.log('🔧 Initializing Admin Panel...');
        await this.loadAllData();
        this.setupEventListeners();
        this.populateSection('speakers');
    }

    async loadAllData() {
        try {
            this.showLoading();
            
            const [hallsRes, speakersRes, schedulesRes, timeSlotsRes] = await Promise.all([
                fetch('/api/halls'),
                fetch('/api/speakers'),
                fetch('/api/schedule'),
                fetch('/api/timeslots')
            ]);

            this.halls = await hallsRes.json();
            this.speakers = await speakersRes.json();
            this.schedules = await schedulesRes.json();
            this.timeSlots = await timeSlotsRes.json();

            console.log('✅ Admin data loaded:', {
                halls: this.halls.length,
                speakers: this.speakers.length,
                schedules: this.schedules.length,
                timeSlots: this.timeSlots.length
            });

            this.hideLoading();
        } catch (error) {
            console.error('❌ Error loading admin data:', error);
            this.showToast('Failed to load data', 'error');
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.switchSection(section);
            });
        });
    }

    switchSection(section) {
        this.currentSection = section;
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === section) {
                btn.classList.add('active');
            }
        });

        // Update sections
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        // Populate section content
        this.populateSection(section);
    }

    populateSection(section) {
        switch (section) {
            case 'speakers':
                this.populateSpeakers();
                break;
            case 'schedule':
                this.populateSchedule();
                break;
            case 'halls':
                this.populateHalls();
                break;
            case 'settings':
                this.populateSettings();
                break;
        }
    }

    populateSpeakers() {
        const speakersGrid = document.getElementById('speakers-grid');
        
        if (this.speakers.length === 0) {
            speakersGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #718096;">
                    <h3>👥 No Speakers Added Yet</h3>
                    <p>Click "Add New Speaker" to get started!</p>
                </div>
            `;
            return;
        }

        speakersGrid.innerHTML = this.speakers.map(speaker => `
            <div class="speaker-card">
                <div class="speaker-card-header">
                    <div>
                        <div class="speaker-name">${speaker.full_name}</div>
                        <span class="speaker-code">${speaker.speaker_code}</span>
                    </div>
                </div>
                <div class="speaker-title">${speaker.title}</div>
                <div class="speaker-contact">
                    📧 ${speaker.email}<br>
                    📱 ${speaker.phone || 'Not provided'}
                </div>
                <div class="speaker-actions">
                    <button class="btn btn-small btn-primary" onclick="adminApp.editSpeaker(${speaker.speaker_id})">✏️ Edit</button>
                    <button class="btn btn-small btn-danger" onclick="adminApp.deleteSpeaker(${speaker.speaker_id})">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    }

    populateSchedule() {
        this.populateScheduleFilters();
        this.filterSchedule();
    }

    populateScheduleFilters() {
        // Populate hall filter
        const hallFilter = document.getElementById('admin-hall-filter');
        hallFilter.innerHTML = '<option value="">All Halls</option>' +
            this.halls.map(hall => `<option value="${hall.hall_id}">${hall.hall_name}</option>`).join('');
    }

    filterSchedule() {
        const hallFilter = document.getElementById('admin-hall-filter').value;
        const dayFilter = document.getElementById('admin-day-filter').value;
        
        let filteredSchedules = [...this.schedules];
        
        if (hallFilter) {
            filteredSchedules = filteredSchedules.filter(s => s.hall_id == hallFilter);
        }
        
        if (dayFilter) {
            filteredSchedules = filteredSchedules.filter(s => s.day_number == dayFilter);
        }

        this.displayScheduleTable(filteredSchedules);
    }

    displayScheduleTable(schedules) {
        const tableBody = document.getElementById('schedule-table-body');
        
        if (schedules.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #718096;">
                        📅 No schedules found. Try adjusting your filters or add new sessions.
                    </td>
                </tr>
            `;
            return;
        }

        // Sort by day, then by time
        schedules.sort((a, b) => {
            if (a.day_number !== b.day_number) {
                return a.day_number - b.day_number;
            }
            return a.slot_order - b.slot_order;
        });

        tableBody.innerHTML = schedules.map(schedule => `
            <tr>
                <td><strong>Day ${schedule.day_number}</strong></td>
                <td>${this.formatTime(schedule.start_time)} - ${this.formatTime(schedule.end_time)}</td>
                <td>${schedule.hall_name}</td>
                <td>
                    <strong>${schedule.speaker_name}</strong><br>
                    <small style="color: #718096;">${schedule.speaker_code}</small>
                </td>
                <td>${schedule.session_title || '<em>No title</em>'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-small btn-primary" onclick="adminApp.editSchedule(${schedule.schedule_id})">✏️ Edit</button>
                        <button class="btn btn-small btn-danger" onclick="adminApp.deleteSchedule(${schedule.schedule_id})">🗑️ Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    populateHalls() {
        const hallsGrid = document.getElementById('halls-grid');
        
        if (this.halls.length === 0) {
            hallsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #718096;">
                    <h3>🏢 No Halls Configured</h3>
                    <p>Add halls to start scheduling sessions!</p>
                </div>
            `;
            return;
        }

        hallsGrid.innerHTML = this.halls.map(hall => `
            <div class="hall-card">
                <div class="hall-icon">🏢</div>
                <div class="hall-name">${hall.hall_name}</div>
                <div class="hall-details">
                    📍 ${hall.location}<br>
                    👥 Capacity: ${hall.capacity} people
                </div>
                <div class="speaker-actions">
                    <button class="btn btn-small btn-primary" onclick="adminApp.editHall(${hall.hall_id})">✏️ Edit</button>
                    <button class="btn btn-small btn-danger" onclick="adminApp.deleteHall(${hall.hall_id})">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    }

    populateSettings() {
        const statsDisplay = document.getElementById('admin-stats');
        
        // Calculate statistics
        const totalSpeakers = this.speakers.length;
        const totalSessions = this.schedules.length;
        const totalHalls = this.halls.length;
        const uniqueDays = [...new Set(this.timeSlots.map(ts => ts.day_number))].length;

        statsDisplay.innerHTML = `
            <div class="stat-item">
                <span class="stat-number">${totalSpeakers}</span>
                <span class="stat-label">Total Speakers</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${totalSessions}</span>
                <span class="stat-label">Scheduled Sessions</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${totalHalls}</span>
                <span class="stat-label">Available Halls</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${uniqueDays}</span>
                <span class="stat-label">Conference Days</span>
            </div>
        `;
    }

    // =================== SPEAKER MANAGEMENT ===================
    showAddSpeakerForm() {
        document.getElementById('add-speaker-form').reset();
        document.getElementById('add-speaker-modal').classList.remove('hidden');
    }

    async addSpeaker(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const speakerData = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            title: formData.get('title'),
            bio: formData.get('bio')
        };

        try {
            this.showLoading();
            
            const response = await fetch('/api/speakers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(speakerData)
            });

            if (!response.ok) {
                throw new Error('Failed to add speaker');
            }

            const result = await response.json();
            
            this.showToast(`Speaker ${speakerData.full_name} added successfully! Code: ${result.speaker_code}`, 'success');
            this.closeModal('add-speaker-modal');
            await this.loadAllData();
            this.populateSpeakers();
            
        } catch (error) {
            console.error('Error adding speaker:', error);
            this.showToast('Failed to add speaker', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteSpeaker(speakerId) {
        if (!confirm('Are you sure you want to delete this speaker? This will also remove all their scheduled sessions.')) {
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`/api/speakers/${speakerId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete speaker');
            }

            this.showToast('Speaker deleted successfully', 'success');
            await this.loadAllData();
            this.populateSpeakers();
            
        } catch (error) {
            console.error('Error deleting speaker:', error);
            this.showToast('Failed to delete speaker', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // =================== SCHEDULE MANAGEMENT ===================
    showAddScheduleForm() {
        this.populateScheduleForm();
        document.getElementById('add-schedule-modal').classList.remove('hidden');
    }

    populateScheduleForm() {
        // Populate speakers
        const speakerSelect = document.getElementById('schedule-speaker');
        speakerSelect.innerHTML = '<option value="">Select Speaker</option>' +
            this.speakers.map(speaker => 
                `<option value="${speaker.speaker_id}">${speaker.full_name} (${speaker.speaker_code})</option>`
            ).join('');

        // Populate halls
        const hallSelect = document.getElementById('schedule-hall');
        hallSelect.innerHTML = '<option value="">Select Hall</option>' +
            this.halls.map(hall => 
                `<option value="${hall.hall_id}">${hall.hall_name} - ${hall.location}</option>`
            ).join('');

        // Populate time slots
        const slotSelect = document.getElementById('schedule-slot');
        slotSelect.innerHTML = '<option value="">Select Time Slot</option>' +
            this.timeSlots.map(slot => 
                `<option value="${slot.slot_id}">Day ${slot.day_number} - ${this.formatTime(slot.start_time)} to ${this.formatTime(slot.end_time)}</option>`
            ).join('');
    }

    async addSchedule(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const scheduleData = {
            speaker_id: formData.get('speaker_id'),
            hall_id: formData.get('hall_id'),
            slot_id: formData.get('slot_id'),
            session_title: formData.get('session_title'),
            session_description: formData.get('session_description'),
            conference_id: 1
        };

        try {
            this.showLoading();
            
            const response = await fetch('/api/schedules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scheduleData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add schedule');
            }

            this.showToast('Session scheduled successfully!', 'success');
            this.closeModal('add-schedule-modal');
            await this.loadAllData();
            this.populateSchedule();
            
        } catch (error) {
            console.error('Error adding schedule:', error);
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteSchedule(scheduleId) {
        if (!confirm('Are you sure you want to delete this scheduled session?')) {
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`/api/schedules/${scheduleId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete schedule');
            }

            this.showToast('Session deleted successfully', 'success');
            await this.loadAllData();
            this.populateSchedule();
            
        } catch (error) {
            console.error('Error deleting schedule:', error);
            this.showToast('Failed to delete schedule', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // =================== UTILITY METHODS ===================
    formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</strong>
            ${message}
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showLoading() {
        if (!document.getElementById('loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(overlay);
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // =================== QUICK ACTIONS ===================
    exportSchedule() {
        const csvContent = this.generateScheduleCSV();
        this.downloadCSV(csvContent, 'conference-schedule.csv');
        this.showToast('Schedule exported successfully!', 'success');
    }

    generateScheduleCSV() {
        const headers = ['Day', 'Time', 'Hall', 'Speaker Code', 'Speaker Name', 'Session Title', 'Duration'];
        const rows = this.schedules.map(schedule => [
            `Day ${schedule.day_number}`,
            `${this.formatTime(schedule.start_time)} - ${this.formatTime(schedule.end_time)}`,
            schedule.hall_name,
            schedule.speaker_code,
            schedule.speaker_name,
            schedule.session_title || '',
            this.getSessionDuration(schedule.start_time, schedule.end_time)
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
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

    viewPublicSite() {
        window.open('/', '_blank');
    }

    async resetData() {
        if (!confirm('⚠️ WARNING: This will delete ALL speakers and schedules. Are you absolutely sure?')) {
            return;
        }
        if (!confirm('This action cannot be undone. Type "DELETE" to confirm:')) {
            return;
        }

        try {
            this.showLoading();
            
            // Delete all schedules first
            await fetch('/api/schedules/all', { method: 'DELETE' });
            
            // Then delete all speakers
            await fetch('/api/speakers/all', { method: 'DELETE' });
            
            this.showToast('All data has been reset successfully', 'warning');
            await this.loadAllData();
            this.populateSection(this.currentSection);
            
        } catch (error) {
            console.error('Error resetting data:', error);
            this.showToast('Failed to reset data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Placeholder methods for edit functionality
    editSpeaker(speakerId) {
        this.showToast('Edit speaker functionality - Coming in Phase 2!', 'info');
    }

    editSchedule(scheduleId) {
        this.showToast('Edit schedule functionality - Coming in Phase 2!', 'info');
    }

    editHall(hallId) {
        this.showToast('Edit hall functionality - Coming in Phase 2!', 'info');
    }

    showAddHallForm() {
        this.showToast('Add hall functionality - Coming in Phase 2!', 'info');
    }

    deleteHall(hallId) {
        this.showToast('Delete hall functionality - Coming in Phase 2!', 'info');
    }
}

// Initialize admin app
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Admin Panel Starting...');
    window.adminApp = new ConferenceAdmin();
});