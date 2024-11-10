
require('dotenv').config(); // Load environment variables

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const cron = require('node-cron');

// MongoDB connection details
const DB_URI = process.env.DB_URI;
const DB_NAME = process.env.DB_NAME;

// Directory to save the backup files
const BACKUP_DIR = path.join(__dirname, "backups");

// Function to run the backup
function backupDatabase() {
  const date = new Date().toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format
  const backupFileName = `${DB_NAME}-backup-${date}.gz`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  console.log('DB_URI:', DB_URI);  // Check if DB_URI is loaded correctly
  console.log('DB_NAME:', DB_NAME); // Check if DB_NAME is loaded correctly

  // Command to run the backup using mongodump
  const command = `mongodump --uri="${DB_URI}" --db=${DB_NAME} --archive=${backupFilePath} --gzip`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup failed: ${error.message}`);
      return;
    }
    console.log(`Backup successful: ${backupFilePath}`);

    // Cleanup old backups (keep only the last 3)
    cleanupBackups();
  });
}

// Function to clean up backups and keep only the last 3
function cleanupBackups() {
  fs.readdir(BACKUP_DIR, (err, files) => {
    if (err) {
      console.error("Failed to read backup directory:", err);
      return;
    }

    // Filter and sort the backup files by modification time (latest first)
    const backupFiles = files.result
      .filter(file => file.startsWith(DB_NAME + '-backup-') && file.endsWith(".gz"))
      .map(file => ({
        name: file,
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by latest first

    // Keep only the latest 3 backups, delete older ones
    const filesToDelete = backupFiles.slice(3); // Files older than the latest 3 backups

    filesToDelete.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file.name);
      fs.unlink(filePath, err => {
        if (err) {
          console.error(`Failed to delete backup file: ${filePath}`);
        } else {
          console.log(`Deleted old backup: ${filePath}`);
        }
      });
    });
  });
}

// Schedule the backup to run every 48 hours at 2 AM
let task;

function startJob() {
  if (!task) {
    task = cron.schedule('0 2 */2 * *', () => {
      console.log('Running backup at 2 AM every 48 hours...');
      backupDatabase();
    });
    console.log('Cron job started');
  } else {
    console.log('Cron job is already running');
  }
}

function stopJob() {
  if (task) {
    task.stop(); // Stop the cron job if it's running
    task = null; // Reset the task reference
    console.log('Cron job stopped');
  } else {
    console.log('No cron job is running');
  }
}

// Example usage
// startJob(); 
// stopJob();  // Call stopJob() to stop the job when necessary
