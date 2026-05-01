const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const initDb = async () => {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            // Create users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT
            )`);

            // Create content table
            db.run(`CREATE TABLE IF NOT EXISTS content (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                section_id TEXT,
                key TEXT,
                value TEXT,
                UNIQUE(section_id, key)
            )`);

            // Create contacts table
            db.run(`CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                phone TEXT,
                email TEXT,
                service TEXT,
                message TEXT,
                status TEXT DEFAULT 'New',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Add default admin if not exists
            if (process.env.NODE_ENV === 'production') {
                if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
                    console.error('FATAL ERROR: ADMIN_USERNAME and ADMIN_PASSWORD must be explicitly set in production!');
                    process.exit(1);
                }
            }
            
            const adminUser = process.env.ADMIN_USERNAME || 'admin123';
            const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
            if (!process.env.ADMIN_USERNAME) {
                console.warn('WARNING: ADMIN_USERNAME not set, using default credentials');
            }
            const hashedPassword = await bcrypt.hash(adminPass, 10);
            db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, [adminUser, hashedPassword]);

            // Initial content seed
            const initialContent = [
                ['hero', 'title', 'Luật sư và Đại diện Sở hữu trí tuệ đồng hành cùng doanh nghiệp bảo vệ tài sản pháp lý'],
                ['hero', 'subtitle', 'Công ty Luật HDS tư vấn đăng ký, khai thác và bảo vệ quyền sở hữu trí tuệ; đồng thời hỗ trợ pháp lý doanh nghiệp trong hợp đồng, đầu tư, M&A, tranh chấp và tuân thủ.'],
                ['hero', 'cta_primary', 'Nhận tư vấn ban đầu'],
                ['hero', 'cta_secondary', 'Xem lĩnh vực dịch vụ'],
                ['hero', 'image', '/image/luatvietan.vn_.png'], // Using the reference image as default hero for now
                ['footer', 'company_name', 'Công ty Luật HDS'],
                ['footer', 'slogan', 'Built on Trust'],
                ['footer', 'address', '169 Nguyễn Ngọc Vũ, Hà Nội, Vietnam'],
                ['footer', 'phone', '024 362 795 55'],
                ['footer', 'email', 'contact@hdslaw.vn']
            ];

            const stmt = db.prepare(`INSERT OR IGNORE INTO content (section_id, key, value) VALUES (?, ?, ?)`);
            initialContent.forEach(item => stmt.run(item));
            stmt.finalize();

            resolve();
        });
    });
};

module.exports = { db, initDb };
