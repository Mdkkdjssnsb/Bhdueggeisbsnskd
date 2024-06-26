const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { setInterval } = require('timers');
const cron = require('node-cron'); // For scheduled tasks

const app = express();
const port = 3000;

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Middleware
app.use(bodyParser.json());

// Initialize data object
let data = {};

// Data file path
const dataFilePath = path.join(__dirname, 'data.json');

// Backup folder path
const backupFolderPath = path.join(__dirname, 'backups');
if (!fs.existsSync(backupFolderPath)) {
    fs.mkdirSync(backupFolderPath);
}

// Load data from file or create it if it doesn't exist
if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
} else {
    const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    data = JSON.parse(fileContent);
}

// Save data to file
function saveData() {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    createBackup();
}

// Generate random text for link
function generateRandomText(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomText = '';
    for (let i = 0; i < length; i++) {
        randomText += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return randomText;
}

// Create a backup of the data file
function createBackup() {
    const backupFilePath = path.join(backupFolderPath, `data_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.copyFileSync(dataFilePath, backupFilePath);
}

// Restore the latest backup
function restoreLatestBackup() {
    const backups = fs.readdirSync(backupFolderPath).filter(file => file.endsWith('.json'));
    if (backups.length > 0) {
        const latestBackup = backups.sort().pop();
        const backupFilePath = path.join(backupFolderPath, latestBackup);
        const backupContent = fs.readFileSync(backupFilePath, 'utf8');
        data = JSON.parse(backupContent);
        saveData();
    }
}

// Routes
app.post('/api/goatbin/v1', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    const randomText = generateRandomText();
    data[randomText] = code;  // Store raw code as string
    saveData();

    res.json({ link: `${req.protocol}://${req.get('host')}/raw/${randomText}` });
});

app.get('/raw/:id', (req, res) => {
    const { id } = req.params;
    const snippet = data[id];

    if (!snippet) {
        return res.status(404).json({ error: 'Snippet not found' });
    }

    res.setHeader('Content-Type', 'text/plain'); // Set content type to plain text
    res.send(snippet); // Send raw code as plain text
});

app.get('/send', (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Code is required in the query parameter' });
    }

    const decodedCode = decodeURIComponent(code); // Decode the URL-encoded code
    const randomText = generateRandomText();
    data[randomText] = decodedCode;  // Store raw code as string
    saveData();

    res.json({ link: `${req.protocol}://${req.get('host')}/raw/${randomText}` });
});

// Website uptime check
const websiteURL = 'https://goatbin.onrender.com'; // Change this to your website URL
const uptimeFilePath = path.join(__dirname, 'uptime.json');

function checkWebsiteUptime() {
    http.get(websiteURL, (res) => {
        const statusCode = res.statusCode;
        const status = statusCode >= 200 && statusCode < 300 ? 'UP' : 'DOWN';
        const uptimeData = { status, timestamp: new Date().toISOString() };
        fs.writeFileSync(uptimeFilePath, JSON.stringify(uptimeData, null, 2));
    }).on('error', (err) => {
        const uptimeData = { status: 'DOWN', timestamp: new Date().toISOString(), error: err.message };
        fs.writeFileSync(uptimeFilePath, JSON.stringify(uptimeData, null, 2));
    });
}

// Schedule website uptime check every 5 minutes
setInterval(checkWebsiteUptime, 5 * 60 * 1000);

// Schedule a daily backup at midnight
cron.schedule('0 0 * * *', createBackup);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
