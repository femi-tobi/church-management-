require('dotenv').config();

const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'church_management',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Try to create MySQL pool, fallback to SQLite if MySQL is not available
let pool = null;
let sqliteDb = null;
let useMySQL = true;

async function initializeDatabase() {
  try {
    // Try to connect to MySQL
    pool = mysql.createPool(dbConfig);
    await pool.getConnection();
    console.log('Connected to MySQL database');
    useMySQL = true;
  } catch (error) {
    console.log('MySQL connection failed, falling back to SQLite:', error.message);
    useMySQL = false;
    
    // Initialize SQLite
    const dbPath = path.join(__dirname, 'db.sqlite');
    sqliteDb = new sqlite3.Database(dbPath);
    
    // Create SQLite tables
    sqliteDb.serialize(() => {
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS choristers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        division TEXT NOT NULL
      )`);
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS instruments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        number TEXT NOT NULL UNIQUE,
        is_available INTEGER DEFAULT 1
      )`);
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS logs (
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
    console.log('Connected to SQLite database');
  }
}

// Helper function to execute queries
async function executeQuery(sql, params = []) {
  if (useMySQL) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// Helper function to execute single row queries
async function executeQuerySingle(sql, params = []) {
  if (useMySQL) {
    const [rows] = await pool.execute(sql, params);
    return rows[0];
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

// Helper function to execute insert/update/delete
async function executeUpdate(sql, params = []) {
  if (useMySQL) {
    const [result] = await pool.execute(sql, params);
    return result;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ insertId: this.lastID, affectedRows: this.changes });
      });
    });
  }
}

// Helper function to begin transaction
async function beginTransaction() {
  if (useMySQL) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
  } else {
    return new Promise((resolve) => {
      sqliteDb.serialize(() => {
        sqliteDb.run('BEGIN TRANSACTION');
        resolve(sqliteDb);
      });
    });
  }
}

// Helper function to commit transaction
async function commitTransaction(connection) {
  if (useMySQL) {
    await connection.commit();
    connection.release();
  } else {
    return new Promise((resolve, reject) => {
      connection.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = { 
  pool, 
  sqliteDb, 
  dbConfig, 
  useMySQL, 
  initializeDatabase,
  executeQuery,
  executeQuerySingle,
  executeUpdate,
  beginTransaction,
  commitTransaction
}; 