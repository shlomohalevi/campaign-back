const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
require('dotenv').config(); // Load environment variables


// MongoDB connection details
const DB_URI = process.env.DB_URI;
const DB_NAME = process.env.DB_NAME;
const BACKUP_DIR = __dirname;  // Directory where backups are stored

// Backup file to restore
const BACKUP_FILE = path.join(BACKUP_DIR, `${DB_NAME}-backup.gz`);  // Path to your backup file

// Function to run the restore
function restoreDatabase() {
  // Check if the backup file exists
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`Backup file does not exist: ${BACKUP_FILE}`);
    return;
  }


  // Command to restore the backup using mongorestore
  const command = `mongorestore --uri="${DB_URI}" --archive="${BACKUP_FILE}" --gzip --drop`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Restore failed: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`Restore successful: ${stdout}`);
  });
}

// Call the function to restore the database
restoreDatabase();

// Run the restore function
// restoreDatabase();
