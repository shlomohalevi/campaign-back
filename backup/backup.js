require('dotenv').config(); // Load environment variables
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const cron = require('node-cron');
const Dropbox = require('dropbox').Dropbox;
const fetch = require('isomorphic-fetch'); // Needed for Dropbox API requests

// MongoDB connection details
const DB_URI = process.env.DB_URI;
const DB_NAME = process.env.DB_NAME;

// Directory to save the backup files locally
const BACKUP_DIR = path.join(__dirname, "backups");

// Dropbox access token and refresh token
const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;
const DROPBOX_REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN; // Add refresh token if using OAuth
const DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID; 
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET;

// Initialize Dropbox client
const dbx = new Dropbox({
  accessToken: DROPBOX_ACCESS_TOKEN,
  refreshToken: DROPBOX_REFRESH_TOKEN,
  clientId: DROPBOX_CLIENT_ID,
  clientSecret: DROPBOX_CLIENT_SECRET,
  fetch: fetch
});

// Function to run the backup and save it locally
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

    // Upload the backup to Dropbox
    uploadBackupToDropbox(backupFilePath, backupFileName);
  });
}

// Function to upload the backup to Dropbox
function uploadBackupToDropbox(localFilePath, dropboxFileName) {
  const fileData = fs.readFileSync(localFilePath); // Read the backup file

  // Upload the file to Dropbox
  dbx.filesUpload({ path: `/backups/campain/${dropboxFileName + Date.now().toString() + '.gz'}`, contents: fileData })
    .then(response => {
      console.log(`Backup uploaded to Dropbox: ${response.result.path_display}`);
      
      // After successful upload, delete the local backup file
      fs.unlink(localFilePath, (err) => {
        if (err) {
          console.error(`Failed to delete local backup: ${localFilePath}`);
        } else {
          console.log(`Deleted local backup: ${localFilePath}`);
        }
      });

      // Clean up old backups on Dropbox
      cleanupBackups();
    })
    .catch(error => {
      console.error("Error uploading backup to Dropbox:", error);
    });
}

// Function to clean up old backups in Dropbox (keep only the last 3)
function cleanupBackups() {
  dbx.filesListFolder({ path: '/backups/campain' })
    .then(response => {
      const files = response.result.entries
        .filter(file => file.name.startsWith(DB_NAME + '-backup-') && file.name.endsWith(".gz"))
        .sort((a, b) => new Date(b.client_modified) - new Date(a.client_modified)); // Sort by last modified date

      // Keep only the latest 3 backups
      const filesToDelete = files.slice(3); // Files older than the latest 3 backups

      // Delete the old backups
      filesToDelete.forEach(file => {
        dbx.filesDeleteV2({ path: file.path_display })
          .then(() => {
            console.log(`Deleted old backup from Dropbox: ${file.path_display}`);
          })
          .catch(error => {
            console.error(`Error deleting backup from Dropbox: ${file.path_display}`, error);
          });
      });
    })
    .catch(error => {
      console.error("Error listing Dropbox folder:", error);
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
// startJob();  // Uncomment to start the cron job
// stopJob();   // Uncomment to stop the cron job when necessary
backupDatabase();
