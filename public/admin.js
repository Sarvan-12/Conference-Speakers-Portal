const adminApp = {
    currentSection: 'speakers',

    init() {
        this.bindNav();
        this.loadSpeakers();
        this.loadSchedule();
        this.loadHalls();
        this.loadStats();
    },

    // Navigation
    bindNav() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.showSection(btn.dataset.section);
            });
        });
    },

    showSection(section) {
        this.currentSection = section;
        document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(`${section}-section`).classList.add('active');
    },

    // --- Speakers ---
    async loadSpeakers() {
        const grid = document.getElementById('speakers-grid');
        grid.innerHTML = '<div>Loading...</div>';
        try {
            const res = await fetch('/api/speakers');
            const speakers = await res.json();
            grid.innerHTML = speakers.map(speaker => `
    <div class="speaker-card" style="cursor:pointer;">
        <div onclick="adminApp.showSpeakerDetails(${speaker.speaker_id})">
            <h3>${speaker.full_name} <span style="font-size:0.9em;color:#888;">(${speaker.speaker_code})</span></h3>
            <div class="speaker-meta">${speaker.title || ''}</div>
            <div class="speaker-meta">${speaker.email}</div>
            <div class="speaker-meta">${speaker.phone || ''}</div>
        </div>
        <div class="speaker-actions">
            <button class="btn btn-secondary" onclick="event.stopPropagation();adminApp.editSpeaker(${speaker.speaker_id})">Edit</button>
            <button class="btn btn-warning" onclick="event.stopPropagation();adminApp.deleteSpeaker(${speaker.speaker_id})">Delete</button>
        </div>
    </div>
`).join('');
        } catch (err) {
            grid.innerHTML = '<div>Error loading speakers.</div>';
        }
    },

    showSpeakerDetails: async function(speakerId) {
        const modal = document.getElementById('speaker-details-modal');
        const content = document.getElementById('speaker-details-content');
        content.innerHTML = '<div>Loading...</div>';
        modal.classList.remove('hidden');
        try {
            // Fetch speaker details
            const res = await fetch(`/api/speakers/${speakerId}`);
            const speaker = await res.json();

            // Fetch speaker's schedule
            const scheduleRes = await fetch(`/api/schedule?speaker_id=${speakerId}`);
            const schedule = await scheduleRes.json();

            content.innerHTML = `
                <h3>${speaker.full_name}</h3>
                <div><b>Title:</b> ${speaker.title || ''}</div>
                <div><b>Email:</b> ${speaker.email}</div>
                <div><b>Phone:</b> ${speaker.phone || ''}</div>
                <div><b>Bio:</b> ${speaker.bio || ''}</div>
                <hr>
                <h4>Sessions</h4>
                <ul>
                    ${schedule.length === 0 ? '<li>No sessions scheduled.</li>' : schedule.map(s => `
                        <li>
                            <b>${s.session_title || '(No Title)'}</b>
                            <br>Hall: ${s.hall_name || ''}, Day: ${s.day_number}, ${s.slot_name || ''} (${s.start_time} - ${s.end_time})
                        </li>
                    `).join('')}
                </ul>
            `;
        } catch {
            content.innerHTML = '<div>Error loading speaker details.</div>';
        }
    },

    showAddSpeakerForm() {
        document.getElementById('add-speaker-modal').classList.remove('hidden');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    },

    async addSpeaker(e) {
        e.preventDefault();
        const form = e.target;
        const data = Object.fromEntries(new FormData(form));
        try {
            const res = await fetch('/api/speakers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to add speaker');
            this.closeModal('add-speaker-modal');
            this.loadSpeakers();
            this.showToast('Speaker added!', 'success');
        } catch {
            this.showToast('Error adding speaker.', 'error');
        }
    },

    editSpeaker: async function(speakerId) {
        try {
            const res = await fetch(`/api/speakers/${speakerId}`);
            if (!res.ok) throw new Error();
            const speaker = await res.json();
            document.getElementById('edit-speaker-id').value = speaker.speaker_id;
            document.getElementById('edit-speaker-name').value = speaker.full_name;
            document.getElementById('edit-speaker-email').value = speaker.email;
            document.getElementById('edit-speaker-phone').value = speaker.phone || '';
            document.getElementById('edit-speaker-title').value = speaker.title || '';
            document.getElementById('edit-speaker-bio').value = speaker.bio || '';
            document.getElementById('edit-speaker-modal').classList.remove('hidden');
        } catch {
            this.showToast('Error loading speaker for edit.', 'error');
        }
    },

    updateSpeaker: async function(e) {
        e.preventDefault();
        const form = e.target;
        const data = Object.fromEntries(new FormData(form));
        const speakerId = data.speaker_id;
        try {
            const res = await fetch(`/api/speakers/${speakerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error();
            this.closeModal('edit-speaker-modal');
            this.loadSpeakers();
            this.showToast('Speaker updated!', 'success');
        } catch {
            this.showToast('Error updating speaker.', 'error');
        }
    },

    deleteSpeaker: async function(speakerId) {
        if (!confirm('Are you sure you want to delete this speaker?')) return;
        try {
            const res = await fetch(`/api/speakers/${speakerId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            this.loadSpeakers();
            this.showToast('Speaker deleted!', 'success');
        } catch {
            this.showToast('Error deleting speaker.', 'error');
        }
    },

    // --- Schedule ---
    async loadSchedule() {
        const grid = document.getElementById('schedule-grid');
        grid.innerHTML = '<div>Loading...</div>';
        try {
            const res = await fetch('/api/schedule');
            const schedule = await res.json();
            grid.innerHTML = schedule.map(session => `
                <div class="schedule-card">
                    <h3>${session.session_title || '(No Title)'}</h3>
                    <div class="schedule-meta">Speaker: ${session.speaker_name || ''}</div>
                    <div class="schedule-meta">Hall: ${session.hall_name || ''}</div>
                    <div class="schedule-meta">Day: ${session.day_number}, ${session.slot_name || ''}</div>
                    <div class="schedule-actions">
                        <button class="btn btn-secondary" onclick="adminApp.editSchedule(${session.schedule_id})">Edit</button>
                        <button class="btn btn-warning" onclick="adminApp.deleteSchedule(${session.schedule_id})">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            grid.innerHTML = '<div>Error loading schedule.</div>';
        }
    },

    showAddScheduleForm() {
        document.getElementById('add-schedule-modal').classList.remove('hidden');
        this.populateScheduleForm();
    },

    async populateScheduleForm() {
        const speakerSel = document.getElementById('schedule-speaker');
        const hallSel = document.getElementById('schedule-hall');
        const slotSel = document.getElementById('schedule-slot');
        speakerSel.innerHTML = '<option value="">Select Speaker</option>';
        hallSel.innerHTML = '<option value="">Select Hall</option>';
        slotSel.innerHTML = '<option value="">Select Time Slot</option>';

        try {
            const [speakersRes, hallsRes, slotsRes] = await Promise.all([
                fetch('/api/speakers'),
                fetch('/api/halls'),
                fetch('/api/timeslots')
            ]);
            const speakers = await speakersRes.json();
            const halls = await hallsRes.json();
            const slots = await slotsRes.json();

            speakers.forEach(s => {
                speakerSel.innerHTML += `<option value="${s.speaker_id}">${s.full_name}</option>`;
            });
            halls.forEach(h => {
                hallSel.innerHTML += `<option value="${h.hall_id}">${h.hall_name}</option>`;
            });
            slots.forEach(ts => {
                slotSel.innerHTML += `<option value="${ts.slot_id}">Day ${ts.day_number} - ${ts.slot_name} (${ts.start_time} - ${ts.end_time})</option>`;
            });
        } catch {}
    },

    async addSchedule(e) {
        e.preventDefault();
        const form = e.target;
        const data = Object.fromEntries(new FormData(form));
        try {
            const res = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error();
            this.closeModal('add-schedule-modal');
            this.loadSchedule();
            this.showToast('Session scheduled!', 'success');
        } catch {
            this.showToast('Error scheduling session.', 'error');
        }
    },

    editSchedule(scheduleId) {
        this.showToast('Edit schedule not implemented.', 'error');
    },

    async deleteSchedule(scheduleId) {
        if (!confirm('Delete this session?')) return;
        try {
            const res = await fetch(`/api/schedule/${scheduleId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            this.loadSchedule();
            this.showToast('Session deleted!', 'success');
        } catch {
            this.showToast('Error deleting session.', 'error');
        }
    },

    // --- Halls ---
    async loadHalls() {
        const grid = document.getElementById('halls-grid');
        grid.innerHTML = '<div>Loading...</div>';
        try {
            const res = await fetch('/api/halls');
            const halls = await res.json();
            grid.innerHTML = halls.map(hall => `
                <div class="hall-card">
                    <h3>${hall.hall_name}</h3>
                    <div class="hall-meta">Capacity: ${hall.capacity}</div>
                    <div class="hall-meta">Location: ${hall.location || ''}</div>
                    <div class="hall-actions">
                        <button class="btn btn-secondary" onclick="adminApp.editHall(${hall.hall_id})">Edit</button>
                        <button class="btn btn-warning" onclick="adminApp.deleteHall(${hall.hall_id})">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            grid.innerHTML = '<div>Error loading halls.</div>';
        }
    },

    showAddHallForm() {
        document.getElementById('add-hall-modal').classList.remove('hidden');
    },

    async addHall(e) {
        e.preventDefault();
        const form = e.target;
        const data = Object.fromEntries(new FormData(form));
        try {
            const res = await fetch('/api/halls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error();
            this.closeModal('add-hall-modal');
            this.loadHalls();
            this.showToast('Hall added!', 'success');
        } catch {
            this.showToast('Error adding hall.', 'error');
        }
    },

    editHall(hallId) {
        this.showToast('Edit hall not implemented.', 'error');
    },

    async deleteHall(hallId) {
        if (!confirm('Delete this hall?')) return;
        try {
            const res = await fetch(`/api/halls/${hallId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            this.loadHalls();
            this.showToast('Hall deleted!', 'success');
        } catch {
            this.showToast('Error deleting hall.', 'error');
        }
    },

    // --- Settings ---
    async loadStats() {
        const statsDiv = document.getElementById('admin-stats');
        try {
            const [speakersRes, scheduleRes, hallsRes] = await Promise.all([
                fetch('/api/speakers'),
                fetch('/api/schedule'),
                fetch('/api/halls')
            ]);
            const speakers = await speakersRes.json();
            const schedule = await scheduleRes.json();
            const halls = await hallsRes.json();
            statsDiv.innerHTML = `
                <div>Total Speakers: <b>${speakers.length}</b></div>
                <div>Total Sessions: <b>${schedule.length}</b></div>
                <div>Total Halls: <b>${halls.length}</b></div>
            `;
        } catch {
            statsDiv.innerHTML = '<div>Error loading stats.</div>';
        }
    },

    exportSchedule() {
        this.showToast('Export not implemented.', 'error');
    },

    viewPublicSite() {
        window.open('/', '_blank');
    },

    resetData() {
        this.showToast('Reset not implemented.', 'error');
    },

    // --- Toasts ---
    showToast(msg, type = '') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast${type ? ' ' + type : ''}`;
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }
};



document.addEventListener('DOMContentLoaded', () => adminApp.init());