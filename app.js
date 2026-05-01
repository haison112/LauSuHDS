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
const port = process.env.PORT || 3001;

// Global Configuration
const SITE_URL = process.env.SITE_URL || 'http://localhost:' + port;
const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID || '';

// Security
app.use(helmet({
    contentSecurityPolicy: false, // For easier integration with Google Fonts/CDNs
}));

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many requests, please try again later."
});

// Middleware
app.set('view engine', 'ejs');
app.set('trust proxy', 1); // Trust first proxy for Render/VPS
app.use(express.static('public'));
app.use('/image', express.static('image'));
app.use('/uploads', express.static('public/uploads'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'hds-law-secret-key')) {
    console.error('FATAL ERROR: SESSION_SECRET is not set or using default weak key in production.');
    process.exit(1);
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'hds-law-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Global variables for all templates
app.use((req, res, next) => {
    res.locals.siteUrl = SITE_URL;
    res.locals.pixelId = PIXEL_ID;
    next();
});

// Multer setup
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', "Only image files (jpg, jpeg, png, webp) are allowed!"));
    }
});

// Auth Middleware
const isAdmin = (req, res, next) => {
    if (req.session.adminId) return next();
    res.redirect('/admin/login');
};

// --- Routes ---

// SEO Static Files
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml`);
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>
</urlset>`);
});

// Landing Page
app.get('/', (req, res) => {
    db.all(`SELECT * FROM content`, (err, rows) => {
        if (err) return res.status(500).send(err.message);
        const content = {};
        rows.forEach(row => {
            if (!content[row.section_id]) content[row.section_id] = {};
            content[row.section_id][row.key] = row.value;
        });
        res.render('index', { content });
    });
});

// Contact Form Submission
app.post('/contact', contactLimiter, (req, res) => {
    const { name, phone, email, service, message, honeypot } = req.body;
    
    // Honeypot check
    if (honeypot) return res.status(400).json({ success: false, message: 'Spam detected' });
    
    // Required fields validation
    if (!name || !phone || !message) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ họ tên, số điện thoại và nội dung.' });
    }

    const phoneRegex = /^(0|84)(3|5|7|8|9)([0-9]{8})$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam hợp lệ.' });
    }

    db.run(`INSERT INTO contacts (name, phone, email, service, message) VALUES (?, ?, ?, ?, ?)`,
        [name, phone, email, service, message],
        (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: 'Cảm ơn bạn đã liên hệ. HDS sẽ phản hồi sớm nhất.' });
        }
    );
});

// Admin Auth
app.get('/admin/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).send(err.message);
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.adminId = user.id;
            res.redirect('/admin');
        } else {
            res.render('login', { error: 'Sai tài khoản hoặc mật khẩu' });
        }
    });
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Admin Dashboard
app.get('/admin', isAdmin, (req, res) => {
    db.all(`SELECT * FROM content`, (err, contentRows) => {
        if (err) return res.status(500).send(err.message);
        db.all(`SELECT * FROM contacts ORDER BY created_at DESC`, (err, contactRows) => {
            if (err) return res.status(500).send(err.message);
            const content = {};
            contentRows.forEach(row => {
                if (!content[row.section_id]) content[row.section_id] = {};
                content[row.section_id][row.key] = row.value;
            });
            res.render('admin', { content, contacts: contactRows });
        });
    });
});

// Admin Actions
app.post('/admin/update-content', isAdmin, (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).send(`Lỗi upload ảnh: ${err.message}. <a href="/admin">Quay lại</a>`);
        } else if (err) {
            return res.status(500).send(`Lỗi không xác định: ${err.message}. <a href="/admin">Quay lại</a>`);
        }

        const { section_id, key, value } = req.body;
        let newValue = value;
        if (req.file) newValue = '/uploads/' + req.file.filename;

        db.run(`INSERT INTO content (section_id, key, value) VALUES (?, ?, ?)
                ON CONFLICT(section_id, key) DO UPDATE SET value = excluded.value`,
            [section_id, key, newValue],
            (dbErr) => {
                if (dbErr) return res.status(500).send(dbErr.message);
                res.redirect('/admin');
            }
        );
    });
});

app.post('/admin/update-contact-status', isAdmin, (req, res) => {
    const { id, status } = req.body;
    db.run(`UPDATE contacts SET status = ? WHERE id = ?`, [status, id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/admin/export-excel', isAdmin, async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Contacts');
    worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Họ tên', key: 'name', width: 30 },
        { header: 'Số điện thoại', key: 'phone', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Dịch vụ', key: 'service', width: 30 },
        { header: 'Nội dung', key: 'message', width: 50 },
        { header: 'Trạng thái', key: 'status', width: 15 },
        { header: 'Ngày gửi', key: 'created_at', width: 20 }
    ];
    db.all(`SELECT * FROM contacts ORDER BY created_at DESC`, (err, rows) => {
        if (err) return res.status(500).send(err.message);
        rows.forEach(row => worksheet.addRow(row));
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.xlsx');
        workbook.xlsx.write(res).then(() => res.end());
    });
});

// Initialize and Start
initDb().then(() => {
    app.listen(port, () => {
        console.log(`SERVER_RUNNING_AT_PORT_${port}`);
    });
});
