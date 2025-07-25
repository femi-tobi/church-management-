const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite'));

// Create tables if they don't exist
const initDb = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS choristers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      division TEXT NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS instruments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      number TEXT NOT NULL UNIQUE,
      is_available INTEGER DEFAULT 1
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      division TEXT NOT NULL,
      "group" TEXT,
      chorister_name TEXT NOT NULL,
      phone TEXT,
      instrument_type TEXT NOT NULL,
      instrument_number TEXT NOT NULL,
      sign_out_time TEXT NOT NULL,
      sign_in_time TEXT,
      condition_returned TEXT
    )`);
  });
};

initDb();

// Instrument list and quantities
const instrumentList = [
  { type: 'Violin', quantity: 40 },
  { type: 'Viola', quantity: 10 },
  { type: 'Cielo', quantity: 6 },
  { type: 'Double bass', quantity: 5 },
  { type: 'Flute', quantity: 10 },
  { type: 'Clarinet', quantity: 10 },
  { type: 'Alto sax', quantity: 5 },
  { type: 'Soprano sax', quantity: 5 },
  { type: 'Tenor sax', quantity: 5 },
  { type: 'Trombone', quantity: 6 },
  { type: 'Euphorium', quantity: 4 },
  { type: 'Tuba', quantity: 3 },
  { type: 'French Horn', quantity: 3 },
  { type: 'Keyboard', quantity: 1 },
  { type: 'Trumpet', quantity: 10 },
  { type: 'Harp', quantity: 1 }
];

// Helper: Insert sample data if empty
const insertSampleData = () => {
  db.get('SELECT COUNT(*) as count FROM choristers', (err, row) => {
    if (row.count === 0) {
      const choristers = [
        ['John Doe', 'Adult Choir'],
        ['Jane Smith', 'Adult Choir'],
        ['Samuel Youth', 'Youth Choir'],
        ['Mary Youth', 'Youth Choir'],
        ['Peter Child', 'Children Choir'],
        ['Grace Child', 'Children Choir'],
        ['Paul YPF', 'YPF Choir'],
        ['Ruth YPF', 'YPF Choir']
      ];
      choristers.forEach(([name, division]) => {
        db.run('INSERT INTO choristers (name, division) VALUES (?, ?)', [name, division]);
      });
    }
  });
  // Remove all instruments and re-insert from instrumentList
  db.run('DELETE FROM instruments', [], (err) => {
    if (err) return;
    instrumentList.forEach(({ type, quantity }) => {
      for (let i = 1; i <= quantity; i++) {
        // Pad number with zeros for uniformity
        const number = `${type.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}-${String(i).padStart(3, '0')}`;
        db.run('INSERT INTO instruments (type, number, is_available) VALUES (?, ?, 1)', [type, number]);
      }
    });
  });
};
insertSampleData();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Get all divisions
app.get('/api/divisions', (req, res) => {
  db.all('SELECT DISTINCT division FROM choristers', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.division));
  });
});

// Get choristers by division
app.get('/api/choristers', (req, res) => {
  const { division } = req.query;
  db.all('SELECT name FROM choristers WHERE division = ?', [division], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.name));
  });
});

// Get all instrument types
app.get('/api/instrument-types', (req, res) => {
  db.all('SELECT DISTINCT type FROM instruments', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.type));
  });
});

// Get available instruments by type
app.get('/api/instruments', (req, res) => {
  const { type } = req.query;
  db.all('SELECT number FROM instruments WHERE type = ? AND is_available = 1', [type], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.number));
  });
});

// Sign out instrument
app.post('/api/signout', (req, res) => {
  console.log('Signout request body:', req.body);
  const { division, group, chorister_name, phone, instrument_type, instrument_number } = req.body;
  const signOutTime = new Date().toISOString();
  db.get('SELECT is_available FROM instruments WHERE number = ?', [instrument_number], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Instrument not found.' });
    if (row.is_available === 0) {
      return res.status(400).json({ error: 'Instrument is already signed out! Please sign it in before signing out again.' });
    }
    db.serialize(() => {
      db.run('INSERT INTO logs (division, "group", chorister_name, phone, instrument_type, instrument_number, sign_out_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [division, group, chorister_name, phone, instrument_type, instrument_number, signOutTime],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          db.run('UPDATE instruments SET is_available = 0 WHERE number = ?', [instrument_number]);
          res.json({ success: true });
        }
      );
    });
  });
});

// Sign in instrument
app.post('/api/signin', (req, res) => {
  const { instrument_number, condition_returned } = req.body;
  const signInTime = new Date().toISOString();
  db.serialize(() => {
    db.get('SELECT id FROM logs WHERE instrument_number = ? AND sign_in_time IS NULL ORDER BY sign_out_time DESC LIMIT 1', [instrument_number], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Log not found' });
      db.run('UPDATE logs SET sign_in_time = ?, condition_returned = ? WHERE id = ?', [signInTime, condition_returned, row.id], function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        db.run('UPDATE instruments SET is_available = 1 WHERE number = ?', [instrument_number]);
        res.json({ success: true });
      });
    });
  });
});

// Get logs (with optional search)
app.get('/api/logs', (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM logs';
  let params = [];
  if (search) {
    sql += ' WHERE division LIKE ? OR chorister_name LIKE ? OR instrument_type LIKE ? OR instrument_number LIKE ?';
    params = Array(4).fill(`%${search}%`);
  }
  sql += ' ORDER BY sign_out_time DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = app; 