const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { setInterval } = require('timers');

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

// Check if data file exists, if not, create it
if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
} else {
    // Load data from existing file
    const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    data = JSON.parse(fileContent);
}

// Save data to file with added spaces
function saveData() {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
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

// Routes
app.post('/api/goatbin/v1', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    const randomText = generateRandomText();
    // Save code with added spaces preserving formatting
    data[randomText] = { code: code, createdAt: new Date().toISOString() };
    saveData();

    res.json({ link: `${req.protocol}://${req.get('host')}/raw/${randomText}` });
});

app.get('/raw/:id', (req, res) => {
    const { id } = req.params;
    const snippet = data[id];

    if (!snippet) {
        return res.status(404).json({ error: 'Snippet not found' });
    }

    res.json(snippet);
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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
