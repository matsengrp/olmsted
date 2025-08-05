const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
// Simple ID generation function
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(global.LOCAL_DATA_PATH, 'uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedExtensions = ['.json', '.gz'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JSON and GZ files are allowed. Convert PCP CSV files to AIRR format first.'));
    }
  }
});

// Process uploaded file
const processUploadedFile = async (filePath, fileType, originalName) => {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(global.LOCAL_DATA_PATH, 'temp', `upload-${generateId()}`);
    
    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    // Prepare command based on file type
    const scriptPath = path.resolve(__dirname, '../../bin/process_data.py');
    const args = [
      scriptPath,
      '-i', filePath,
      '-o', outputDir,
      '-f', fileType,
      '--seed', '42'  // For consistent processing
    ];
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Process script not found at: ${scriptPath}`);
    }

    console.log('Processing file with command:', 'python3', args.join(' '));
    console.log('Script path resolved to:', scriptPath);
    console.log('Working directory:', process.cwd());
    console.log('Input file exists:', fs.existsSync(filePath));
    console.log('Output directory created:', fs.existsSync(outputDir));

    // Execute the processing script
    execFile('python3', args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Processing error:', error);
        console.error('stderr:', stderr);
        // Clean up on error
        fs.rmSync(outputDir, { recursive: true, force: true });
        reject(new Error('Failed to process file: ' + (stderr || error.message)));
        return;
      }

      console.log('Processing stdout:', stdout);

      try {
        // Read the generated datasets.json
        const datasetsPath = path.join(outputDir, 'datasets.json');
        if (!fs.existsSync(datasetsPath)) {
          throw new Error('Processing did not generate datasets.json');
        }

        const datasets = JSON.parse(fs.readFileSync(datasetsPath, 'utf8'));
        
        // Get the first dataset (for now, assume single dataset per upload)
        const dataset = Array.isArray(datasets) ? datasets[0] : datasets;
        
        // Generate a temporary dataset ID
        const tempDatasetId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        dataset.dataset_id = tempDatasetId;
        dataset.temporary = true;
        dataset.upload_time = new Date().toISOString();
        dataset.original_filename = originalName;

        // Move processed files to the main data directory with temp prefix
        const files = fs.readdirSync(outputDir);
        files.forEach(file => {
          const srcPath = path.join(outputDir, file);
          const destPath = path.join(global.LOCAL_DATA_PATH, file.replace(/^(clones\.|tree\.)/, `$1temp-${tempDatasetId}-`));
          fs.renameSync(srcPath, destPath);
        });

        // Clean up output directory
        fs.rmSync(outputDir, { recursive: true, force: true });

        // Update the datasets.json in the main data directory
        updateDatasetsJson(dataset);

        resolve({
          success: true,
          datasetId: tempDatasetId,
          dataset: dataset
        });

      } catch (err) {
        console.error('Post-processing error:', err);
        // Clean up on error
        fs.rmSync(outputDir, { recursive: true, force: true });
        reject(err);
      }
    });
  });
};

// Update the main datasets.json file with temporary dataset
const updateDatasetsJson = (newDataset) => {
  const datasetsPath = path.join(global.LOCAL_DATA_PATH, 'datasets.json');
  let datasets = [];

  try {
    if (fs.existsSync(datasetsPath)) {
      const content = fs.readFileSync(datasetsPath, 'utf8');
      datasets = JSON.parse(content);
      if (!Array.isArray(datasets)) {
        datasets = [datasets];
      }
    }
  } catch (err) {
    console.error('Error reading existing datasets.json:', err);
    datasets = [];
  }

  // Add the new temporary dataset
  datasets.push(newDataset);

  // Write back
  fs.writeFileSync(datasetsPath, JSON.stringify(datasets, null, 2));

  // Also create gzipped version
  execFile('gzip', ['-k9f', datasetsPath], (err) => {
    if (err) {
      console.error('Error gzipping datasets.json:', err);
    }
  });
};

// Clean up old temporary files (older than 24 hours)
const cleanupOldTempFiles = () => {
  const dataPath = global.LOCAL_DATA_PATH;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const now = Date.now();

  try {
    // Read current datasets
    const datasetsPath = path.join(dataPath, 'datasets.json');
    if (!fs.existsSync(datasetsPath)) return;

    let datasets = JSON.parse(fs.readFileSync(datasetsPath, 'utf8'));
    if (!Array.isArray(datasets)) datasets = [datasets];

    // Filter out old temporary datasets
    const activeDatasets = datasets.filter(dataset => {
      if (!dataset.temporary) return true;
      
      const uploadTime = new Date(dataset.upload_time).getTime();
      if (now - uploadTime > maxAge) {
        // Delete associated files
        const filesToDelete = [
          `clones.temp-${dataset.dataset_id}.json`,
          `clones.temp-${dataset.dataset_id}.json.gz`
        ];

        // Also find and delete tree files
        const files = fs.readdirSync(dataPath);
        files.forEach(file => {
          if (file.startsWith(`tree.temp-${dataset.dataset_id}-`)) {
            filesToDelete.push(file);
          }
        });

        filesToDelete.forEach(file => {
          const filePath = path.join(dataPath, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Cleaned up old temp file:', file);
          }
        });

        return false; // Remove from datasets list
      }
      return true;
    });

    // Update datasets.json if needed
    if (activeDatasets.length !== datasets.length) {
      fs.writeFileSync(datasetsPath, JSON.stringify(activeDatasets, null, 2));
      execFile('gzip', ['-k9f', datasetsPath], (err) => {
        if (err) console.error('Error gzipping datasets.json:', err);
      });
    }

  } catch (err) {
    console.error('Error during cleanup:', err);
  }
};

// Run cleanup periodically (every hour)
setInterval(cleanupOldTempFiles, 60 * 60 * 1000);

// Apply upload routes to Express app
const applyUploadHandler = (app) => {
  // File upload endpoint
  app.post('/upload-data', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const fileType = req.body.fileType || 'auto';
    console.log('File uploaded:', req.file.originalname, 'Type:', fileType);

    try {
      const result = await processUploadedFile(req.file.path, fileType, req.file.originalname);
      
      // Delete the original uploaded file
      fs.unlinkSync(req.file.path);

      res.json(result);
    } catch (error) {
      console.error('Upload processing error:', error);
      // Clean up uploaded file on error
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).send(error.message || 'Failed to process uploaded file');
    }
  });

  // Endpoint to get current datasets (including temporary ones)
  app.get('/api/datasets', (req, res) => {
    const datasetsPath = path.join(global.LOCAL_DATA_PATH, 'datasets.json');
    try {
      if (fs.existsSync(datasetsPath)) {
        const datasets = JSON.parse(fs.readFileSync(datasetsPath, 'utf8'));
        res.json(datasets);
      } else {
        res.json([]);
      }
    } catch (err) {
      console.error('Error reading datasets:', err);
      res.status(500).send('Failed to read datasets');
    }
  });

  // Initial cleanup on server start
  cleanupOldTempFiles();
};

module.exports = {
  applyUploadHandler
};