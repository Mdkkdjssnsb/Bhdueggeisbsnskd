const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});



const dataFilePath = path.join(__dirname, 'data.json');

// Middleware
app.use(bodyParser.json());

// Load existing data or initialize an empty object
let data = {};
if (fs.existsSync(dataFilePath)) {
    const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    data = JSON.parse(fileContent);
}

// Save data to file
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
app.post('/save', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    const randomText = generateRandomText();
    data[randomText] = { code, createdAt: new Date().toISOString() };
    saveData();

  res.json({ link: `${req.protocol}://${req.get('host')}/raw/${randomText}` });
  });

app.get('/raw/:id', (req, res) => {
    const { id } = req.params;
    const snippet = data[id];

    if (!snippet) {
        return res.status(404).json({ error: 'Snippet not found' });
    }

    res.json(snippet.code);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}); 
