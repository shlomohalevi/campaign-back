const { exec } = require("child_process");
const path = require("path");

// MongoDB connection details
// const DB_URI = process.env.DB_URI; // MongoDB URI
const DB_URI = 'mongodb://localhost:27017'
const DB_NAME = 'campain'// The database name to restore
const BACKUP_DIR = path.join(__dirname, "backups"); // Directory where backups are stored

// Backup file to restore
const BACKUP_FILE = path.join(BACKUP_DIR, "Campain-backup-2024-11-10.gz"); // Path to your backup file

// Function to run the restore
function restoreDatabase() {
  // Command to restore the backup using mongorestore
  const command = `mongorestore --uri="${DB_URI}" --archive="${BACKUP_FILE}" --gzip --drop`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Restore failed: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`Restore successful: ${stdout}`);
  });
}

// Run the restore function
// restoreDatabase();
