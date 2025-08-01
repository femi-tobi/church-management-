const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

// MySQL configuration
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'church_management',
  port: process.env.DB_PORT || 3306
};

// SQLite database path (if you have the old database file)
const sqlitePath = path.join(__dirname, 'backend', 'db.sqlite');

async function migrateData() {
  try {
    // Check if SQLite database exists
    const fs = require('fs');
    if (!fs.existsSync(sqlitePath)) {
      console.log('SQLite database file not found. Skipping migration.');
      console.log('The application will create fresh tables and sample data.');
      return;
    }

    console.log('Starting data migration from SQLite to MySQL...');

    // Connect to SQLite
    const sqliteDb = new sqlite3.Database(sqlitePath);
    
    // Connect to MySQL
    const mysqlConnection = await mysql.createConnection(mysqlConfig);

    // Migrate choristers
    console.log('Migrating choristers...');
    const choristers = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM choristers', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const chorister of choristers) {
      await mysqlConnection.execute(
        'INSERT INTO choristers (name, division) VALUES (?, ?)',
        [chorister.name, chorister.division]
      );
    }

    // Migrate instruments
    console.log('Migrating instruments...');
    const instruments = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM instruments', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const instrument of instruments) {
      await mysqlConnection.execute(
        'INSERT INTO instruments (type, number, is_available) VALUES (?, ?, ?)',
        [instrument.type, instrument.number, instrument.is_available === 1]
      );
    }

    // Migrate logs
    console.log('Migrating logs...');
    const logs = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM logs', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const log of logs) {
      await mysqlConnection.execute(
        'INSERT INTO logs (division, `group`, chorister_name, phone, instrument_type, instrument_number, sign_out_time, sign_in_time, condition_returned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          log.division,
          log.group,
          log.chorister_name,
          log.phone,
          log.instrument_type,
          log.instrument_number,
          log.sign_out_time,
          log.sign_in_time,
          log.condition_returned
        ]
      );
    }

    // Close connections
    sqliteDb.close();
    await mysqlConnection.end();

    console.log('Migration completed successfully!');
    console.log(`Migrated ${choristers.length} choristers, ${instruments.length} instruments, and ${logs.length} logs.`);

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData }; 