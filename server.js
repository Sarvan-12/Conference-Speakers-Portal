const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'conference_portal',
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

// Get speaker details
app.get('/api/speaker/:speakerId', async (req, res) => {
  try {
    const { speakerId } = req.params;
    const [rows] = await db.execute(
      'SELECT * FROM speakers WHERE speaker_id = ?',
      [speakerId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Speaker not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching speaker:', error);
    res.status(500).json({ error: 'Failed to fetch speaker' });
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