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
    adminApp.populateScheduleForm();
},

async populateScheduleForm() {
    // Fetch all data
    const [speakersRes, hallsRes, slotsRes, schedulesRes] = await Promise.all([
        fetch('/api/speakers'),
        fetch('/api/halls'),
        fetch('/api/timeslots'),
        fetch('/api/schedule')
    ]);
    const speakers = await speakersRes.json();
    const halls = await hallsRes.json();
    const slots = await slotsRes.json();
    const schedules = await schedulesRes.json();

    // Speakers
    const speakerSel = document.getElementById('schedule-speaker');
    speakerSel.innerHTML = '<option value="">Select Speaker</option>';
    speakers.forEach(s => {
        speakerSel.innerHTML += `<option value="${s.speaker_id}" data-title="${s.title || ''}">${s.full_name}</option>`;
    });

    // Halls: Only show halls with at least one available slot
    const hallSel = document.getElementById('schedule-hall');
    hallSel.innerHTML = '<option value="">Select Hall</option>';
    halls.forEach(hall => {
        const hallHasFreeSlot = slots.some(slot =>
            !schedules.some(sch => sch.hall_id == hall.hall_id && sch.slot_id == slot.slot_id)
        );
        if (hallHasFreeSlot) {
            hallSel.innerHTML += `<option value="${hall.hall_id}">${hall.hall_name}</option>`;
        }
    });

    // Slots: Only show slots available for the selected hall
    const slotSel = document.getElementById('schedule-slot');
    slotSel.innerHTML = '<option value="">Select Time Slot</option>';

    hallSel.onchange = function() {
        const hallId = hallSel.value;
        slotSel.innerHTML = '<option value="">Select Time Slot</option>';
        if (!hallId) return;
        slots.forEach(slot => {
            const isTaken = schedules.some(sch => sch.hall_id == hallId && sch.slot_id == slot.slot_id);
            if (!isTaken) {
                slotSel.innerHTML += `<option value="${slot.slot_id}">Day ${slot.day_number} - ${slot.slot_name} (${slot.start_time} - ${slot.end_time})</option>`;
            }
        });
    };

    // Session title auto-fill
    speakerSel.onchange = function() {
        const selected = speakerSel.options[speakerSel.selectedIndex];
        document.getElementById('session-title').value = selected.getAttribute('data-title') || '';
    };
},

editSchedule: async function(scheduleId) {
    try {
        const [speakersRes, hallsRes, slotsRes, schedulesRes] = await Promise.all([
            fetch('/api/speakers'),
            fetch('/api/halls'),
            fetch('/api/timeslots'),
            fetch('/api/schedule')
        ]);
        const speakers = await speakersRes.json();
        const halls = await hallsRes.json();
        const slots = await slotsRes.json();
        const schedules = await schedulesRes.json();

        const schedule = schedules.find(s => s.schedule_id == scheduleId);
        if (!schedule) throw new Error();

        // --- Speaker dropdown: show all speakers, just like add modal ---
        const speakerSel = document.getElementById('edit-speaker-id');
        speakerSel.innerHTML = '<option value="">Select Speaker</option>';
        speakers.forEach(s => {
            speakerSel.innerHTML += `<option value="${s.speaker_id}" data-title="${s.title || ''}">${s.full_name}</option>`;
        });
        // speakerSel.value = schedule.speaker_id ? String(schedule.speaker_id) : '';

        // --- Halls ---
        const hallSel = document.getElementById('edit-hall-id');
        hallSel.innerHTML = '<option value="">Select Hall</option>';
        halls.forEach(hall => {
            hallSel.innerHTML += `<option value="${hall.hall_id}">${hall.hall_name}</option>`;
        });
        hallSel.value = schedule.hall_id ? String(schedule.hall_id) : '';

        // --- Slots ---
        const slotSel = document.getElementById('edit-slot-id');
        slotSel.innerHTML = '<option value="">Select Time Slot</option>';
        slots.forEach(slot => {
            slotSel.innerHTML += `<option value="${slot.slot_id}">Day ${slot.day_number} - ${slot.slot_name} (${slot.start_time} - ${slot.end_time})</option>`;
        });
        slotSel.value = schedule.slot_id ? String(schedule.slot_id) : '';

        // Session title auto-fill
        const selectedSpeaker = speakers.find(s => s.speaker_id == schedule.speaker_id);
        document.getElementById('edit-session-title').value = selectedSpeaker ? (selectedSpeaker.title || '') : '';

        // Set hidden fields
        document.getElementById('edit-schedule-id').value = schedule.schedule_id;
        document.getElementById('edit-conference-id').value = schedule.conference_id;

        // Session title auto-update on speaker change
        speakerSel.onchange = function() {
            const selected = speakerSel.options[speakerSel.selectedIndex];
            document.getElementById('edit-session-title').value = selected.getAttribute('data-title') || '';
        };

        document.getElementById('edit-schedule-modal').classList.remove('hidden');
    } catch (err) {
        this.showToast('Error loading schedule for edit.', 'error');
    }
},

addSchedule: async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    // You may want to set conference_id here if needed
    data.conference_id = 1; // or your actual conference_id logic
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

// Helper for updating halls in edit modal
updateAvailableHallsEdit(slots, halls, schedules, editingScheduleId) {
    const hallSel = document.getElementById('edit-hall-id');
    hallSel.innerHTML = '<option value="">Select Hall</option>';
    halls.forEach(hall => {
        const hallHasFreeSlot = slots.some(slot =>
            !schedules.some(sch => sch.hall_id == hall.hall_id && sch.slot_id == slot.slot_id && sch.schedule_id != editingScheduleId)
        );
        if (hallHasFreeSlot) {
            hallSel.innerHTML += `<option value="${hall.hall_id}">${hall.hall_name}</option>`;
        }
    });
},

// Helper for updating slots in edit modal
updateAvailableSlotsEdit(slots, schedules, editingScheduleId) {
    const hallId = document.getElementById('edit-hall-id').value;
    const slotSel = document.getElementById('edit-slot-id');
    slotSel.innerHTML = '<option value="">Select Time Slot</option>';
    if (!hallId) return;
    slots.forEach(slot => {
        const isTaken = schedules.some(sch =>
            sch.hall_id == hallId && sch.slot_id == slot.slot_id && sch.schedule_id != editingScheduleId
        );
        if (!isTaken) {
            slotSel.innerHTML += `<option value="${slot.slot_id}">Day ${slot.day_number} - ${slot.slot_name} (${slot.start_time} - ${slot.end_time})</option>`;
        }
    });
},
updateSchedule: async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const scheduleId = data.schedule_id;
    try {
        const res = await fetch(`/api/schedule/${scheduleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errMsg = await res.text();
            throw new Error(errMsg);
        }
        this.closeModal('edit-schedule-modal');
        this.loadSchedule();
        this.showToast('Schedule updated!', 'success');
    } catch (err) {
        this.showToast('Error updating schedule.', 'error');
    }
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


editHall: async function(hallId) {
    console.log('Editing hall:', hallId);
    try {
        const res = await fetch(`/api/halls/${hallId}`);
        if (!res.ok) throw new Error();
        const hall = await res.json();
        document.getElementById('edit-hall-id').value = hall.hall_id;
        document.getElementById('edit-hall-name').value = hall.hall_name;
        document.getElementById('edit-hall-capacity').value = hall.capacity;
        document.getElementById('edit-hall-location').value = hall.location || '';
        document.getElementById('edit-hall-modal').classList.remove('hidden');
    } catch {
        this.showToast('Error loading hall for edit.', 'error');
    }
},

updateHall: async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const hallId = data.hall_id;
    try {
        const res = await fetch(`/api/halls/${hallId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error();
        this.closeModal('edit-hall-modal');
        this.loadHalls();exportSchedule
        this.showToast('Hall updated!', 'success');
    } catch {
        this.showToast('Error updating hall.', 'error');
    }
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
        fetch('/api/export/schedule')
        .then(res => {
            if (!res.ok) throw new Error();
            return res.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'conference_schedule.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            this.showToast('Schedule exported!', 'success');
        })
        .catch(() => this.showToast('Export failed.', 'error'));
    },

    viewPublicSite() {
        window.open('/', '_blank');
    },

    resetData() {
        if (!confirm('Are you sure you want to reset ALL data? This cannot be undone!')) return;
    fetch('/api/reset', { method: 'POST' })
        .then(res => {
            if (!res.ok) throw new Error();
            this.loadSpeakers();
            this.loadSchedule();
            this.loadHalls();
            this.loadStats();
            this.showToast('All data reset!', 'success');
        })
        .catch(() => this.showToast('Reset failed.', 'error'));
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