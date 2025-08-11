const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let db;

// Initialize database connection
async function initDatabase() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database');
    
    // Test the connection
    const [rows] = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection test successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// =================== API ROUTES ===================

// Get all conferences
app.get('/api/conferences', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM conferences ORDER BY start_date DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching conferences:', error);
    res.status(500).json({ error: 'Failed to fetch conferences' });
  }
});

// Get all halls for a conference
app.get('/api/halls', async (req, res) => {
  try {
    const conferenceId = req.query.conference_id || process.env.DEFAULT_CONFERENCE_ID;
    const [rows] = await db.execute(
      'SELECT * FROM halls WHERE conference_id = ? ORDER BY hall_name',
      [conferenceId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching halls:', error);
    res.status(500).json({ error: 'Failed to fetch halls' });
  }
});

// Get all speakers
app.get('/api/speakers', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM speakers ORDER BY speaker_code');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching speakers:', error);
    res.status(500).json({ error: 'Failed to fetch speakers' });
  }
});

// Get complete schedule with joins
app.get('/api/schedule', async (req, res) => {
  try {
    const conferenceId = req.query.conference_id || process.env.DEFAULT_CONFERENCE_ID;
    const query = `
      SELECT 
        sch.schedule_id,
        sch.session_title,
        sch.session_description,
        sch.status,
        sp.speaker_id,
        sp.speaker_code,
        sp.full_name as speaker_name,
        sp.title as speaker_title,
        sp.bio as speaker_bio,
        sp.email,
        sp.phone,
        h.hall_id,
        h.hall_name,
        h.capacity,
        h.location,
        ts.slot_id,
        ts.day_number,
        ts.start_time,
        ts.end_time,
        ts.slot_name,
        ts.slot_order
      FROM schedules sch
      JOIN speakers sp ON sch.speaker_id = sp.speaker_id
      JOIN halls h ON sch.hall_id = h.hall_id
      JOIN time_slots ts ON sch.slot_id = ts.slot_id
      WHERE sch.conference_id = ?
      ORDER BY h.hall_name, ts.day_number, ts.slot_order
    `;
    
    const [rows] = await db.execute(query, [conferenceId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Get schedule by hall
app.get('/api/schedule/hall/:hallId', async (req, res) => {
  try {
    const { hallId } = req.params;
    const conferenceId = req.query.conference_id || process.env.DEFAULT_CONFERENCE_ID;
    
    const query = `
      SELECT 
        sch.schedule_id,
        sch.session_title,
        sp.speaker_code,
        sp.full_name as speaker_name,
        sp.title as speaker_title,
        h.hall_name,
        ts.day_number,
        ts.start_time,
        ts.end_time,
        ts.slot_name,
        ts.slot_order
      FROM schedules sch
      JOIN speakers sp ON sch.speaker_id = sp.speaker_id
      JOIN halls h ON sch.hall_id = h.hall_id
      JOIN time_slots ts ON sch.slot_id = ts.slot_id
      WHERE sch.conference_id = ? AND h.hall_id = ?
      ORDER BY ts.day_number, ts.slot_order
    `;
    
    const [rows] = await db.execute(query, [conferenceId, hallId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching hall schedule:', error);
    res.status(500).json({ error: 'Failed to fetch hall schedule' });
  }
});

// Get Speaker Profile + Schedule by Code
app.get('/api/speaker/profile/:code', async (req, res) => {
    try {
        const { code } = req.params;

        // Get speaker
        const [speakers] = await db.execute(
            'SELECT * FROM speakers WHERE speaker_code = ?',
            [code]
        );
        if (speakers.length === 0) {
            return res.status(404).json({ error: 'Speaker not found' });
        }
        const speaker = speakers[0];

        // Get schedule
        const [schedule] = await db.execute(`
            SELECT 
                sch.session_title,
                h.hall_name,
                h.capacity,
                ts.day_number,
                ts.start_time,
                ts.end_time,
                ts.slot_name,
                sch.schedule_id
            FROM schedules sch
            JOIN halls h ON sch.hall_id = h.hall_id
            JOIN time_slots ts ON sch.slot_id = ts.slot_id
            WHERE sch.speaker_id = ?
            ORDER BY ts.day_number, ts.start_time
        `, [speaker.speaker_id]);

        res.json({
            speaker: {
                speaker_id: speaker.speaker_id,
                speaker_code: speaker.speaker_code,
                full_name: speaker.full_name,
                email: speaker.email,
                phone: speaker.phone,
                title: speaker.title,
                bio: speaker.bio
            },
            schedule: schedule,
            total_sessions: schedule.length
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Uploaded Files for Speaker
app.get('/api/speaker/files/:code', async (req, res) => {
    try {
        const { code } = req.params;

        // Find speaker_id
        const [speakers] = await db.execute(
            'SELECT speaker_id FROM speakers WHERE speaker_code = ?',
            [code]
        );
        if (speakers.length === 0) {
            return res.status(404).json({ error: 'Speaker not found' });
        }
        const speakerId = speakers[0].speaker_id;

        // Get uploaded files
        const [files] = await db.execute(`
            SELECT 
                file_id,
                original_name AS original_filename,
                stored_filename,
                file_size,
                upload_date,
                hall_id,
                slot_id
            FROM uploaded_files
            WHERE speaker_id = ?
            ORDER BY upload_date DESC
        `, [speakerId]);

        res.json(files);
    } catch (err) {
        console.error('File fetch error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Get time slots for a conference
app.get('/api/timeslots', async (req, res) => {
  try {
    const conferenceId = req.query.conference_id || process.env.DEFAULT_CONFERENCE_ID;
    const [rows] = await db.execute(
      'SELECT * FROM time_slots WHERE conference_id = ? ORDER BY day_number, slot_order',
      [conferenceId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({ error: 'Failed to fetch time slots' });
  }
});

// =================== NEW SPEAKER ROUTES ===================

// Speaker Authentication Route
app.post('/api/speaker/login', async (req, res) => {
    try {
        const { speakerCode } = req.body;
        
        if (!speakerCode) {
            return res.status(400).json({ error: 'Speaker code is required' });
        }
        
        // Query speaker by code
        const [speakers] = await db.execute(
            'SELECT * FROM speakers WHERE speaker_code = ?',
            [speakerCode]
        );
        
        if (speakers.length === 0) {
            return res.status(404).json({ error: 'Invalid speaker code' });
        }
        
        const speaker = speakers[0];
        
        // Get speaker's schedule
        const [schedule] = await db.execute(`
            SELECT 
                sch.session_title,
                h.hall_name,
                h.capacity,
                ts.day_number,
                ts.start_time,
                ts.end_time,
                ts.slot_name,
                sch.schedule_id
            FROM schedules sch
            JOIN halls h ON sch.hall_id = h.hall_id
            JOIN time_slots ts ON sch.slot_id = ts.slot_id
            WHERE sch.speaker_id = ?
            ORDER BY ts.day_number, ts.start_time
        `, [speaker.speaker_id]);
        
        res.json({
            speaker: {
                speaker_id: speaker.speaker_id,
                speaker_code: speaker.speaker_code,
                full_name: speaker.full_name,
                email: speaker.email,
                phone: speaker.phone,
                title: speaker.title,
                bio: speaker.bio
            },
            schedule: schedule,
            total_sessions: schedule.length
        });
        
    } catch (error) {
        console.error('Speaker login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Speaker Profile by Code
app.get('/api/speaker/profile/:code', async (req, res) => {
    try {
        const { code } = req.params;
        
        const [speakers] = await db.execute(
            'SELECT * FROM speakers WHERE speaker_code = ?',
            [code]
        );
        
        if (speakers.length === 0) {
            return res.status(404).json({ error: 'Speaker not found' });
        }
        
        const speaker = speakers[0];
        
        // Remove sensitive info if needed
        delete speaker.speaker_id; // Keep ID private
        
        res.json(speaker);
        
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =================== FILE UPLOAD ROUTE ===================
const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        fs.ensureDirSync(uploadPath); // make sure folder exists
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: uploadStorage });

app.post('/api/upload/presentation', upload.single('presentation'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { speakerCode, hallName, dayNumber, sessionTitle } = req.body;

        // Find speaker_id
        const [speakers] = await db.execute(
            'SELECT speaker_id FROM speakers WHERE speaker_code = ?',
            [speakerCode]
        );
        if (speakers.length === 0) {
            return res.status(404).json({ error: 'Speaker not found' });
        }
        const speakerId = speakers[0].speaker_id;

        // Optional: Find hall_id and slot_id
        const [hall] = await db.execute('SELECT hall_id FROM halls WHERE hall_name = ?', [hallName]);
        const hallId = hall.length > 0 ? hall[0].hall_id : null;

        const [slot] = await db.execute(
            'SELECT slot_id FROM time_slots WHERE day_number = ? LIMIT 1',
            [dayNumber]
        );
        const slotId = slot.length > 0 ? slot[0].slot_id : null;

        // Insert file record
        await db.execute(`
            INSERT INTO uploaded_files (
                original_name,
                stored_filename,
                file_size,
                upload_date,
                hall_id,
                slot_id,
                speaker_id
            ) VALUES (?, ?, ?, NOW(), ?, ?, ?)
        `, [
            req.file.originalname,
            req.file.filename,
            req.file.size,
            hallId,
            slotId,
            speakerId
        ]);

        res.json({ success: true, message: 'File uploaded successfully!' });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});


// Serve pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
  });
}

startServer();