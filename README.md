# Church Instrument Management System

A web-based system for managing church instrument checkouts and returns.

## Features

- Chorister selection by division
- Instrument checkout and check-in
- Condition tracking for returned instruments
- Search and filter logs
- Responsive web interface

## Database Migration: SQLite to MySQL

This project has been migrated from SQLite to MySQL for better scalability and performance.

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v8.0 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. MySQL Database Setup

1. **Install MySQL Server** (if not already installed)
   - Windows: Download from [MySQL Downloads](https://dev.mysql.com/downloads/mysql/)
   - macOS: `brew install mysql`
   - Linux: `sudo apt-get install mysql-server`

2. **Start MySQL Service**
   ```bash
   # Windows
   net start mysql
   
   # macOS
   brew services start mysql
   
   # Linux
   sudo systemctl start mysql
   ```

3. **Create Database and Tables**
   ```bash
   # Option 1: Using the provided SQL script
   mysql -u root -p < setup-database.sql
   
   # Option 2: Manual setup
   mysql -u root -p
   ```
   
   Then in MySQL console:
   ```sql
   CREATE DATABASE church_management;
   USE church_management;
   -- Run the contents of setup-database.sql
   ```

### 3. Environment Configuration

1. **Copy the environment example file:**
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` file with your MySQL credentials:**
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=church_management
   DB_PORT=3306
   ```

### 4. Install dotenv (for environment variables)

```bash
npm install dotenv
```

### 5. Update config.js to use dotenv

Add this line at the top of `backend/config.js`:
```javascript
require('dotenv').config();
```

### 6. Run the Application

```bash
cd backend
node server.js
```

The application will be available at `http://localhost:3000`

## Database Schema

### Tables

1. **choristers** - Stores chorister information
   - id (Primary Key)
   - name
   - division

2. **instruments** - Stores instrument inventory
   - id (Primary Key)
   - type
   - number (Unique)
   - is_available (Boolean)

3. **logs** - Stores checkout/checkin transactions
   - id (Primary Key)
   - division
   - group
   - chorister_name
   - phone
   - instrument_type
   - instrument_number
   - sign_out_time
   - sign_in_time
   - condition_returned

## API Endpoints

- `GET /api/divisions` - Get all divisions
- `GET /api/choristers?division=<division>` - Get choristers by division
- `GET /api/instrument-types` - Get all instrument types
- `GET /api/instruments?type=<type>` - Get available instruments by type
- `POST /api/signout` - Sign out an instrument
- `POST /api/signin` - Sign in an instrument
- `GET /api/logs?search=<search>` - Get logs with optional search

## Migration Notes

### Key Changes from SQLite to MySQL:

1. **Database Connection**: Now uses MySQL connection pool instead of SQLite file
2. **Data Types**: 
   - `INTEGER PRIMARY KEY AUTOINCREMENT` → `INT AUTO_INCREMENT PRIMARY KEY`
   - `TEXT` → `VARCHAR(255)`
   - `INTEGER` (boolean) → `BOOLEAN`
   - `TEXT` (datetime) → `DATETIME`
3. **Queries**: Updated to use MySQL syntax and async/await pattern
4. **Transactions**: Proper MySQL transaction handling with `beginTransaction()` and `commit()`
5. **Error Handling**: Enhanced error handling for MySQL operations

### Benefits of MySQL Migration:

- Better performance for concurrent users
- ACID compliance for data integrity
- Better scalability
- More robust backup and recovery options
- Advanced query optimization
- Better support for complex queries and relationships

## Troubleshooting

### Common Issues:

1. **Connection Refused**: Ensure MySQL server is running
2. **Access Denied**: Check MySQL user credentials in `.env` file
3. **Database Not Found**: Run the setup-database.sql script
4. **Port Already in Use**: Change the port in server.js or stop conflicting services

### MySQL Commands:

```bash
# Check MySQL status
sudo systemctl status mysql

# Restart MySQL
sudo systemctl restart mysql

# Access MySQL console
mysql -u root -p

# Show databases
SHOW DATABASES;

# Use database
USE church_management;

# Show tables
SHOW TABLES;
```
