const { exec } = require("child_process");
const util = require('util');
const execPromise = util.promisify(exec); // Promisify exec

const path = require("path");
const fs = require("fs");
const AppError = require("../../utils/AppError");
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
    throw new Error(`Backup file does not exist: ${BACKUP_FILE}`);
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
const restoreDatabaseMiddleware = async (req, res, next) => {
  console.log('Starting database restore process...');

  // Check if the backup file exists
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`Backup file does not exist: ${BACKUP_FILE}`);
    return next(new AppError(404, `Backup file does not exist: ${BACKUP_FILE}`));
  }

  // Command to restore the backup using mongorestore
  const command = `mongorestore --uri="${DB_URI}" --archive="${BACKUP_FILE}" --gzip --drop --nsInclude="${DB_NAME}.*"`;


  try {
    const { stdout, stderr } = await execPromise(command);

    // Check for critical errors in stderr
    if (stderr && !stderr.includes('deprecated')) {
      console.error(`stderr: ${stderr}`);
      // return next(new AppError(500, `Restore failed: ${stderr}`)); // Critical error
    }

    // If it's just a deprecation warning, log it
    if (stderr && stderr.includes('deprecated')) {
      console.warn(`Warning: ${stderr}`); // Log as warning
    }

    // If everything is fine, log and send response
    console.log(`Restore successful: ${stdout}`);
    res.status(200).json({ message: 'Database restore successful', details: stdout });

  } catch (error) {
    console.error(`Restore failed: ${error.message}`);
    return next(new Error(`Restore failed: ${error.message}`));
  }
};

module.exports = { restoreDatabaseMiddleware };

// Call the function to restore the database
// restoreDatabase();

// Run the restore function
// restoreDatabase();
