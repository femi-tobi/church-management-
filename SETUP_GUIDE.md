# Church Management System - Setup Guide

## Quick Start (SQLite Fallback)

The application now supports both MySQL and SQLite. If MySQL is not available, it will automatically fall back to SQLite.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Application
```bash
cd backend
node server.js
```

The application will:
- Try to connect to MySQL first
- If MySQL is not available, automatically fall back to SQLite
- Create the necessary tables and sample data
- Start the server on http://localhost:3000

## MySQL Setup (Optional)

If you want to use MySQL instead of SQLite:

### Option 1: Install MySQL Server
1. Download MySQL from: https://dev.mysql.com/downloads/mysql/
2. Install and configure MySQL
3. Create a database named `church_management`
4. Create a `.env` file with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=church_management
DB_PORT=3306
```

### Option 2: Use a Cloud MySQL Service
You can use services like:
- PlanetScale (free tier available)
- Railway
- Supabase
- AWS RDS

Update the `.env` file with the cloud database credentials.

### Option 3: Use Docker (if Docker is installed)
```bash
docker-compose up -d
```

## Current Status

✅ **Application is ready to run with SQLite fallback**
- All dependencies installed
- Hybrid database support implemented
- Automatic fallback to SQLite if MySQL is not available

## Features

- **Automatic Database Detection**: Tries MySQL first, falls back to SQLite
- **Same Functionality**: All features work with both databases
- **Easy Migration**: Can easily switch to MySQL later
- **No Data Loss**: Data is preserved when switching databases

## Next Steps

1. Run the application: `cd backend && node server.js`
2. Open http://localhost:3000 in your browser
3. Test the instrument management features
4. When ready, set up MySQL for better performance and scalability

## Troubleshooting

- **Port 3000 in use**: Change the port in `server.js`
- **Database errors**: Check the console for specific error messages
- **Frontend not loading**: Ensure you're accessing the correct URL

The application is now ready to use with automatic database fallback! 