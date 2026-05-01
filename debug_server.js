require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { db, initDb } = require('./database');

const app = express();
const port = 4000; // Change port to 4000

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.static('public'));
app.use('/image', express.static('image'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: 'hds-law-secret', resave: false, saveUninitialized: true }));

app.get('/robots.txt', (req, res) => res.send('User-agent: *\nAllow: /'));

app.get('/', (req, res) => {
    db.all(`SELECT * FROM content`, (err, rows) => {
        const content = {};
        rows.forEach(row => {
            if (!content[row.section_id]) content[row.section_id] = {};
            content[row.section_id][row.key] = row.value;
        });
        res.render('index', { 
            content, 
            siteUrl: 'http://localhost:4000',
            pixelId: ''
        });
    });
});

initDb().then(() => {
    app.listen(port, () => console.log('DEBUG_SERVER_ON_4000'));
});
