const express = require('express');
const path = require('path');
const { 
  initializeDatabase, 
  executeQuery, 
  executeQuerySingle, 
  executeUpdate, 
  beginTransaction, 
  commitTransaction 
} = require('./config');
const app = express();
const PORT = process.env.PORT || 3000;

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
const insertSampleData = async () => {
  try {
    // Check if choristers table is empty
    const choristerRows = await executeQuery('SELECT COUNT(*) as count FROM choristers');
    if (choristerRows[0].count === 0) {
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
      
      for (const [name, division] of choristers) {
        await executeUpdate('INSERT INTO choristers (name, division) VALUES (?, ?)', [name, division]);
      }
      console.log('Sample choristers data inserted');
    }

    // Remove all instruments and re-insert from instrumentList
    await executeUpdate('DELETE FROM instruments');
    
    for (const { type, quantity } of instrumentList) {
      for (let i = 1; i <= quantity; i++) {
        // Pad number with zeros for uniformity
        const number = `${type.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}-${String(i).padStart(3, '0')}`;
        await executeUpdate('INSERT INTO instruments (type, number, is_available) VALUES (?, ?, ?)', [type, number, 1]);
      }
    }
    
    console.log('Sample instruments data inserted');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
};

// Initialize database and start server
async function startServer() {
  await initializeDatabase();
  await insertSampleData();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Get all divisions
app.get('/api/divisions', async (req, res) => {
  try {
    const rows = await executeQuery('SELECT DISTINCT division FROM choristers');
    res.json(rows.map(r => r.division));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get choristers by division
app.get('/api/choristers', async (req, res) => {
  try {
    const { division } = req.query;
    const rows = await executeQuery('SELECT name FROM choristers WHERE division = ?', [division]);
    res.json(rows.map(r => r.name));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all instrument types
app.get('/api/instrument-types', async (req, res) => {
  try {
    const rows = await executeQuery('SELECT DISTINCT type FROM instruments');
    res.json(rows.map(r => r.type));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available instruments by type
app.get('/api/instruments', async (req, res) => {
  try {
    const { type } = req.query;
    const rows = await executeQuery('SELECT number FROM instruments WHERE type = ? AND is_available = ?', [type, 1]);
    res.json(rows.map(r => r.number));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sign out instrument
app.post('/api/signout', async (req, res) => {
  try {
    console.log('Signout request body:', req.body);
    const { division, group, chorister_name, phone, instrument_type, instrument_number } = req.body;
    const signOutTime = new Date().toISOString();
    
    // Check if instrument is available
    const instrumentRows = await executeQuerySingle('SELECT is_available FROM instruments WHERE number = ?', [instrument_number]);
    
    if (!instrumentRows) {
      return res.status(404).json({ error: 'Instrument not found.' });
    }
    
    if (!instrumentRows.is_available) {
      return res.status(400).json({ error: 'Instrument is already signed out! Please sign it in before signing out again.' });
    }
    
    // Insert log and update instrument availability
    const connection = await beginTransaction();
    
    await executeUpdate(
      'INSERT INTO logs (division, "group", chorister_name, phone, instrument_type, instrument_number, sign_out_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [division, group, chorister_name, phone, instrument_type, instrument_number, signOutTime]
    );
    
    await executeUpdate('UPDATE instruments SET is_available = ? WHERE number = ?', [0, instrument_number]);
    
    await commitTransaction(connection);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sign in instrument
app.post('/api/signin', async (req, res) => {
  try {
    const { instrument_number, condition_returned } = req.body;
    const signInTime = new Date().toISOString();
    
    // Find the most recent log for this instrument that hasn't been signed in
    const logRows = await executeQuerySingle(
      'SELECT id FROM logs WHERE instrument_number = ? AND sign_in_time IS NULL ORDER BY sign_out_time DESC LIMIT 1',
      [instrument_number]
    );
    
    if (!logRows) {
      return res.status(404).json({ error: 'Log not found' });
    }
    
    const connection = await beginTransaction();
    
    // Update the log with sign in time and condition
    await executeUpdate(
      'UPDATE logs SET sign_in_time = ?, condition_returned = ? WHERE id = ?',
      [signInTime, condition_returned, logRows.id]
    );
    
    // Mark instrument as available
    await executeUpdate('UPDATE instruments SET is_available = ? WHERE number = ?', [1, instrument_number]);
    
    await commitTransaction(connection);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logs (with optional search)
app.get('/api/logs', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM logs';
    let params = [];
    
    if (search) {
      sql += ' WHERE division LIKE ? OR chorister_name LIKE ? OR instrument_type LIKE ? OR instrument_number LIKE ?';
      params = Array(4).fill(`%${search}%`);
    }
    
    sql += ' ORDER BY sign_out_time DESC';
    
    const rows = await executeQuery(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
startServer(); 