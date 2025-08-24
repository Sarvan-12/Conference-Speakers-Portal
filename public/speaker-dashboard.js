class SpeakerDashboard {
    constructor() {
        this.speakerData = null;
        this.scheduleData = [];
        this.uploadedFiles = [];
        this.currentSession = null;
        this.init();
    }

    async init() {
        try {
            // Check authentication
            this.speakerData = JSON.parse(localStorage.getItem('speakerData'));
            if (!this.speakerData) {
                window.location.href = '/speaker-login.html';
                return;
            }

            // Load data
            await this.loadData();
            this.renderDashboard();
            this.setupEventListeners();

            // Hide loading overlay
            document.getElementById('loadingOverlay').style.display = 'none';

        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showError('Failed to load dashboard');
        }
    }

    async loadData() {
        try {
            const speakerCode = this.speakerData.speaker?.speaker_code;

            // Load speaker profile and files
            const [profileResponse, filesResponse] = await Promise.all([
                fetch(`/api/speaker/profile/${speakerCode}`),
                fetch(`/api/speaker/files/${speakerCode}`)

            ]);

            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                this.speakerData = profileData;
                this.scheduleData = profileData.schedule;
            }

            if (filesResponse.ok) {
                this.uploadedFiles = await filesResponse.json();
            }

        } catch (error) {
            console.error('Data loading error:', error);
            throw error;
        }
    }

    renderDashboard() {
        
        document.getElementById('speakerCode').textContent = this.speakerData.speaker?.speaker_code;
        document.getElementById('speakerName').textContent = this.speakerData.speaker?.full_name;


        // Update statistics
        this.updateStatistics();

        // Render schedule
        this.renderSchedule();

        // Update profile
        this.renderProfile();
    }

    updateStatistics() {
        const totalSessions = this.scheduleData.length;
        const uploadedCount = this.uploadedFiles.length;
        const pendingUploads = totalSessions - uploadedCount;
        
        // Calculate total file size
        const totalSize = this.uploadedFiles.reduce((sum, file) => sum + (file.file_size || 0), 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

        document.getElementById('totalSessions').textContent = totalSessions;
        document.getElementById('uploadedFiles').textContent = uploadedCount;
        document.getElementById('pendingUploads').textContent = Math.max(0, pendingUploads);
        document.getElementById('totalSize').textContent = `${totalSizeMB} MB`;
    }

    renderSchedule() {
        const container = document.getElementById('scheduleContainer');
        
        if (this.scheduleData.length === 0) {
            container.innerHTML = '<p class="no-sessions">No scheduled sessions found.</p>';
            return;
        }

        const scheduleHTML = this.scheduleData.map(session => {
            const uploadedFile = this.uploadedFiles.find(file => 
                file.hall_name === session.hall_name && 
                file.day_number === session.day_number
            );

            const hasFile = !!uploadedFile;
            const statusClass = hasFile ? 'status-uploaded' : 'status-pending';
            const statusText = hasFile ? '✅ Uploaded' : '⏳ Pending Upload';

            return `
                <div class="schedule-item">
                    <div class="session-header">
                        <div class="session-info">
                            <h3>${session.session_title}</h3>
                            <div class="session-details">
                                <div class="detail-item">
                                    <span>🏢</span>
                                    <span>${session.hall_name} (${session.capacity} seats)</span>
                                </div>
                                <div class="detail-item">
                                    <span>📅</span>
                                    <span>Day ${session.day_number}</span>
                                </div>
                                <div class="detail-item">
                                    <span>⏰</span>
                                    <span>${this.formatTime(session.start_time)} - ${this.formatTime(session.end_time)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="file-management">
                        <div class="file-status">
                            <span class="file-status-text ${statusClass}">
                                ${statusText}
                            </span>
                        </div>
                        
                        ${hasFile ? `
    <div class="file-info-display">
        <div class="file-name">
            ${uploadedFile.stored_filename}
            <a href="/${uploadedFile.stored_path.replace(/\\/g, '/')}/${uploadedFile.stored_filename}" target="_blank" class="btn btn-secondary" style="margin-left:10px;">
    👁️ View
</a>
        </div>
        <div class="file-meta">
            <span>Size: ${this.formatFileSize(uploadedFile.file_size)}</span>
            <span>Uploaded: ${this.formatDate(uploadedFile.upload_date)}</span>
        </div>
    </div>
` : ''}
                        
                        <div class="file-actions">
    ${hasFile ? `
        <button class="btn btn-danger" onclick="dashboard.deleteFile(${uploadedFile.file_id})">
            🗑️ Delete File
        </button>
    ` : `
        <button class="btn btn-primary" onclick="dashboard.uploadFile('${session.schedule_id}', '${session.hall_name}', ${session.day_number}, '${session.session_title}')">
            📎 Upload Presentation
        </button>
    `}
</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = scheduleHTML;
    }

    renderProfile() {
        const speaker = this.speakerData.speaker;
        document.getElementById('profileName').textContent = speaker.full_name;
        document.getElementById('profileTitle').textContent = speaker.title || 'Speaker';
        document.getElementById('profileEmail').textContent = speaker.email || 'Not provided';
        document.getElementById('profilePhone').textContent = speaker.phone || 'Not provided';
        document.getElementById('profileBio').textContent = speaker.bio || 'No biography available.';
    }

    setupEventListeners() {
        // File upload form
        const uploadForm = document.getElementById('uploadForm');
        const fileInput = document.getElementById('presentationFile');
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInputLabel = document.querySelector('.file-input-label');

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files[0]);
        });

        // File input label click
        fileInputLabel.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

        // Upload form submission
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFileUpload();
        });

        // Click on upload area
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
    }

    handleFileSelection(file) {
        if (!file) return;

        // Validate file type
        const allowedTypes = ['.ppt', '.pptx'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExt)) {
            alert('Please select a PowerPoint file (.ppt or .pptx)');
            return;
        }

        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
            alert('File size must be less than 50MB');
            return;
        }

        // Display file info
        document.getElementById('selectedFileName').textContent = file.name;
        document.getElementById('selectedFileSize').textContent = this.formatFileSize(file.size);
        document.getElementById('fileInfo').style.display = 'block';
        document.getElementById('uploadBtn').disabled = false;

        // Store file reference
        this.selectedFile = file;
    }

    async handleFileUpload() {
        if (!this.selectedFile || !this.currentSession) return;

        const uploadBtn = document.getElementById('uploadBtn');
        const progressDiv = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        try {
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Uploading...';
            progressDiv.style.display = 'block';

            // Create form data
            const formData = new FormData();
            formData.append('presentation', this.selectedFile);
            formData.append('speakerCode', this.speakerData.speaker?.speaker_code);
            formData.append('hallName', this.currentSession.hallName);
            formData.append('dayNumber', this.currentSession.dayNumber);
            formData.append('sessionTitle', this.currentSession.sessionTitle);

            // Upload with progress tracking
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressFill.style.width = percentComplete + '%';
                    progressText.textContent = Math.round(percentComplete) + '%';
                }
            });

            xhr.addEventListener('load', async () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    alert('File uploaded successfully!');
                    this.closeUploadModal();
                    await this.refreshData();
                } else {
                    const error = JSON.parse(xhr.responseText);
                    throw new Error(error.error || 'Upload failed');
                }
            });

            xhr.addEventListener('error', () => {
                throw new Error('Upload failed due to network error');
            });

            xhr.open('POST', '/api/upload/presentation');
            xhr.send(formData);

        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
            
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload Presentation';
            progressDiv.style.display = 'none';
        }
    }

    uploadFile(scheduleId, hallName, dayNumber, sessionTitle) {
        this.currentSession = { scheduleId, hallName, dayNumber, sessionTitle };
        
        // Reset modal
        document.getElementById('modalSessionTitle').textContent = sessionTitle;
        document.getElementById('modalHallName').textContent = hallName;
        document.getElementById('modalDayNumber').textContent = dayNumber;
        document.getElementById('modalStartTime').textContent = this.getSessionTime(hallName, dayNumber);
        
        // Reset form
        document.getElementById('presentationFile').value = '';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadBtn').disabled = true;
        document.getElementById('uploadBtn').textContent = 'Upload Presentation';
        this.selectedFile = null;
        
        // Show modal
        document.getElementById('uploadModal').style.display = 'block';
    }

    replaceFile(scheduleId, hallName, dayNumber, sessionTitle) {
        // Same as upload, but for replacing existing file
        this.uploadFile(scheduleId, hallName, dayNumber, sessionTitle);
    }

    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('File deleted successfully!');
                await this.refreshData();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Delete failed');
            }

        } catch (error) {
            console.error('Delete error:', error);
            alert('Delete failed: ' + error.message);
        }
    }

    closeUploadModal() {
        document.getElementById('uploadModal').style.display = 'none';
        this.currentSession = null;
        this.selectedFile = null;
    }

    async refreshData() {
        try {
            document.getElementById('loadingOverlay').style.display = 'flex';
            await this.loadData();
            this.renderDashboard();
            document.getElementById('loadingOverlay').style.display = 'none';
        } catch (error) {
            console.error('Refresh error:', error);
            this.showError('Failed to refresh data');
        }
    }

    getSessionTime(hallName, dayNumber) {
        const session = this.scheduleData.find(s => 
            s.hall_name === hallName && s.day_number == dayNumber
        );
        return session ? this.formatTime(session.start_time) : 'TBD';
    }

    formatTime(timeString) {
        try {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            return `${displayHour}:${minutes} ${ampm}`;
        } catch {
            return timeString;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString() + ' ' + 
                   new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch {
            return dateString;
        }
    }

    showError(message) {
        alert('Error: ' + message);
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// Global functions
function logout() {
    localStorage.removeItem('speakerData');
    window.location.href = '/speaker-login.html';
}

function refreshData() {
    dashboard.refreshData();
}

// Initialize dashboard
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new SpeakerDashboard();
});