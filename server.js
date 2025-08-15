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
    const [rows] = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection test successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// =================== FILE PROCESSING FUNCTION ===================
async function processUploadedFiles() {
  try {
    console.log('🔄 Starting file processing...');
    const [pendingFiles] = await db.execute(`
      SELECT 
        uf.file_id,
        uf.original_name,
        uf.original_path,
        uf.stored_filename,
        uf.stored_path,
        uf.upload_status,
        s.schedule_id,
        sp.speaker_code,
        h.hall_name,
        ts.slot_id
      FROM uploaded_files uf
      JOIN schedules s ON uf.schedule_id = s.schedule_id
      JOIN speakers sp ON s.speaker_id = sp.speaker_id
      JOIN halls h ON s.hall_id = h.hall_id
      JOIN time_slots ts ON s.slot_id = ts.slot_id
      WHERE uf.upload_status = 'pending'
    `);

    if (pendingFiles.length === 0) {
      console.log('✅ No pending files to process');
      return;
    }

    for (const file of pendingFiles) {
      try {
        console.log(`📂 Processing file: ${file.original_name}`);
        if (!fs.existsSync(file.original_path)) {
          console.error(`❌ Original file not found: ${file.original_path}`);
          await db.execute(
            'UPDATE uploaded_files SET upload_status = ? WHERE file_id = ?',
            ['failed', file.file_id]
          );
          continue;
        }
        const fullStoredPath = path.isAbsolute(file.stored_path)
          ? file.stored_path
          : path.join(__dirname, file.stored_path);
        await fs.ensureDir(fullStoredPath);
        console.log(`📁 Created directory: ${fullStoredPath}`);
        const targetFilePath = path.join(fullStoredPath, file.stored_filename);
        if (file.original_path !== targetFilePath) {
          await fs.copy(file.original_path, targetFilePath);
        } else {
          console.log('Source and destination are the same, skipping copy.');
        }
        console.log(`✅ File copied to: ${targetFilePath}`);
        await db.execute(
          'UPDATE uploaded_files SET upload_status = ? WHERE file_id = ?',
          ['processed', file.file_id]
        );
        console.log(`✅ File processing completed for: ${file.stored_filename}`);
      } catch (fileError) {
        console.error(`❌ Error processing file ${file.file_id}:`, fileError);
        await db.execute(
          'UPDATE uploaded_files SET upload_status = ? WHERE file_id = ?',
          ['failed', file.file_id]
        );
      }
    }
    console.log('🎉 File processing completed!');
  } catch (error) {
    console.error('❌ Error in file processing:', error);
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

// Add new speaker (auto-generate speaker_code)
app.post('/api/speakers', async (req, res) => {
    try {
        const { full_name, email, phone, title, bio } = req.body;
        const [rows] = await db.execute('SELECT MAX(speaker_id) AS maxId FROM speakers');
        const nextId = (rows[0].maxId || 0) + 1;
        const speakerCode = 'SP' + String(nextId).padStart(3, '0');
        await db.execute(
            `INSERT INTO speakers (speaker_code, full_name, email, phone, title, bio)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [speakerCode, full_name, email, phone, title, bio]
        );
        res.json({ success: true, speaker_code: speakerCode });
    } catch (err) {
        console.error('Add speaker error:', err); // <--- Add this line
        res.status(500).json({ error: 'Failed to add speaker' });
    }
});
// Get complete schedule with joins
app.get('/api/schedule', async (req, res) => {
  try {
    let sql = `
      SELECT s.*, h.hall_name, ts.day_number, ts.slot_name, ts.start_time, ts.end_time, sp.full_name AS speaker_name
      FROM schedules s
      JOIN halls h ON s.hall_id = h.hall_id
      JOIN time_slots ts ON s.slot_id = ts.slot_id
      JOIN speakers sp ON s.speaker_id = sp.speaker_id
    `;
    const params = [];
    if (req.query.speaker_id) {
      sql += ' WHERE s.speaker_id = ?';
      params.push(req.query.speaker_id);
    }
    sql += ' ORDER BY ts.day_number, ts.start_time';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
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
        const [speakers] = await db.execute(
            'SELECT * FROM speakers WHERE speaker_code = ?',
            [code]
        );
        if (speakers.length === 0) {
            return res.status(404).json({ error: 'Speaker not found' });
        }
        const speaker = speakers[0];
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
        const [speakers] = await db.execute(
            'SELECT speaker_id FROM speakers WHERE speaker_code = ?',
            [code]
        );
        if (speakers.length === 0) {
            return res.status(404).json({ error: 'Speaker not found' });
        }
        const speakerId = speakers[0].speaker_id;
        const [files] = await db.execute(`
            SELECT 
                uf.file_id,
                uf.original_name,
                uf.stored_filename,
                uf.file_size,
                uf.upload_status,
                uf.upload_date,
                s.session_title,
                h.hall_name,
                ts.day_number,
                ts.slot_name
            FROM uploaded_files uf
            JOIN schedules s ON uf.schedule_id = s.schedule_id
            JOIN halls h ON s.hall_id = h.hall_id
            JOIN time_slots ts ON s.slot_id = ts.slot_id
            WHERE s.speaker_id = ?
            ORDER BY uf.upload_date DESC
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
        const [speakers] = await db.execute(
            'SELECT * FROM speakers WHERE speaker_code = ?',
            [speakerCode]
        );
        if (speakers.length === 0) {
            return res.status(404).json({ error: 'Invalid speaker code' });
        }
        const speaker = speakers[0];
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

// =================== FILE PROCESSING ROUTE ===================
app.post('/api/process-files', async (req, res) => {
    try {
        await processUploadedFiles();
        res.json({ success: true, message: 'File processing completed successfully!' });
    } catch (error) {
        console.error('File processing error:', error);
        res.status(500).json({ error: 'File processing failed' });
    }
});

// =================== FILE UPLOAD ROUTE ===================
const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        fs.ensureDirSync(uploadPath);
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
        const [speakers] = await db.execute(
            'SELECT speaker_id, speaker_code FROM speakers WHERE speaker_code = ?',
            [speakerCode]
        );
        if (speakers.length === 0) {
            return res.status(404).json({ error: 'Speaker not found' });
        }
        const speakerId = speakers[0].speaker_id;
        const speaker_code = speakers[0].speaker_code;
        const [schedules] = await db.execute(
    `SELECT s.schedule_id, s.hall_id, h.hall_name, ts.day_number, ts.slot_order, c.total_days
     FROM schedules s
     JOIN halls h ON s.hall_id = h.hall_id
     JOIN time_slots ts ON s.slot_id = ts.slot_id
     JOIN conferences c ON s.conference_id = c.conference_id
     WHERE s.speaker_id = ? AND h.hall_name = ? AND ts.day_number = ? AND s.session_title = ?`,
    [speakerId, hallName, dayNumber, sessionTitle]
);
        if (schedules.length === 0) {
            return res.status(404).json({ error: 'Session not found for upload' });
        }
        const scheduleId = schedules[0].schedule_id;
        const hallId = schedules[0].hall_id;
        const slotOrder = schedules[0].slot_order;
        const totalDays = schedules[0].total_days;
        const slotOrderInDay = ((slotOrder - 1) % totalDays) + 1;
        const hallFolder = hallName.replace(/[^a-zA-Z0-9_]/g, '_');
        const dayFolder = `Day_${dayNumber}`;
        const originalExt = path.extname(req.file.originalname);
        const originalBase = path.basename(req.file.originalname, originalExt).replace(/[^a-zA-Z0-9_]/g, '_');
        const customFilename = `${slotOrderInDay}_${speaker_code}_${originalBase}${originalExt}`;
        const targetDir = path.join(__dirname, 'uploads', hallFolder, dayFolder);
        await fs.ensureDir(targetDir);
        const targetPath = path.join(targetDir, customFilename);
        await fs.move(req.file.path, targetPath, { overwrite: true });
        await db.execute(`
            INSERT INTO uploaded_files (
                schedule_id,
                hall_id,
                day_number,
                speaker_code,
                slot_order_in_day,
                original_name,
                original_path,
                stored_filename,
                stored_path,
                file_size,
                file_type,
                upload_status,
                upload_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        `, [
            scheduleId,
            hallId,
            dayNumber,
            speaker_code,
            slotOrderInDay,
            req.file.originalname,
            targetPath,
            customFilename,
            path.join('uploads', hallFolder, dayFolder),
            req.file.size,
            req.file.mimetype
        ]);
        res.json({ success: true, message: 'File uploaded successfully!' });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Delete uploaded file by file_id
app.delete('/api/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const [files] = await db.execute(
            'SELECT stored_path, stored_filename FROM uploaded_files WHERE file_id = ?',
            [fileId]
        );
        if (files.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        const filePath = path.join(__dirname, files[0].stored_path, files[0].stored_filename);
        try {
            await fs.remove(filePath);
        } catch (err) {
            console.warn('File not found on disk, skipping:', filePath);
        }
        const [result] = await db.execute(
            'DELETE FROM uploaded_files WHERE file_id = ?',
            [fileId]
        );
        res.json({ success: true, message: 'File deleted successfully!' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Failed to delete file' });
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
  setTimeout(async () => {
    await processUploadedFiles();
  }, 2000);
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`🔄 File processing available at: POST /api/process-files`);
  });
}

// Get a single speaker by ID
app.get('/api/speakers/:id', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM speakers WHERE speaker_id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Speaker not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch speaker' });
    }
});

// Delete speaker
app.delete('/api/speakers/:id', async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM speakers WHERE speaker_id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Speaker not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete speaker' });
    }
});

// Update speaker
app.put('/api/speakers/:id', async (req, res) => {
    try {
        const { full_name, email, phone, title, bio } = req.body;
        const [result] = await db.execute(
            `UPDATE speakers SET full_name=?, email=?, phone=?, title=?, bio=? WHERE speaker_id=?`,
            [full_name, email, phone, title, bio, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Speaker not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update speaker' });
    }
});

startServer();