const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbPath = path.join(__dirname, 'visitors.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            // Create visitors table
            db.run(`CREATE TABLE IF NOT EXISTS visitors (
                id TEXT PRIMARY KEY,
                tc_kimlik TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                birth_year INTEGER,
                reason_for_visit TEXT NOT NULL,
                entry_time TEXT NOT NULL,
                exit_time TEXT,
                visit_duration TEXT,
                is_active INTEGER NOT NULL
            )`, (err) => {
                if (err) {
                    console.error('Error creating visitors table', err.message);
                }
            });

            // Create users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table', err.message);
                } else {
                    // Insert default admin user if not exists
                    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
                    const adminPassword = process.env.ADMIN_PASSWORD || 'password';

                    const checkAdminSql = "SELECT * FROM users WHERE role = 'admin'";
                    db.get(checkAdminSql, [], (err, row) => {
                        if (err) {
                            console.error('Error checking for admin user', err.message);
                            return;
                        }
                        if (!row) {
                            const saltRounds = 10;
                            bcrypt.hash(adminPassword, saltRounds, (err, hashedPassword) => {
                                if (err) {
                                    console.error('Error hashing password', err.message);
                                    return;
                                }
                                const { v4: uuidv4 } = require('uuid');
                                const insertAdminSql = `INSERT INTO users (id, username, password, role, created_at)
                                                        VALUES (?, ?, ?, ?, ?)`;
                                const params = [uuidv4(), adminUsername, hashedPassword, 'admin', new Date().toISOString()];
                                db.run(insertAdminSql, params, function(err) {
                                    if (err) {
                                        console.error('Error inserting default admin user', err.message);
                                    } else {
                                        console.log('Default admin user created.');
                                    }
                                });
                            });
                        }
                    });
                }
            });

            // Create settings table
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`, (err) => {
                if (err) {
                    console.error('Error creating settings table', err.message);
                } else {
                    // Insert default settings if not exist
                    const defaultSettings = [
                        { key: 'kvkk_text', value: 'Bu bir varsayılan KVKK metnidir. Lütfen admin panelinden güncelleyiniz.' },
                        { key: 'aydinlatma_text', value: 'Bu bir varsayılan Kurumsal Aydınlatma Metnidir. Lütfen admin panelinden güncelleyiniz.' },
                        { key: 'redirect_url', value: '' },
                        { key: 'visitor_pdf_path', value: '' }
                    ];

                    const stmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
                    defaultSettings.forEach(setting => {
                        stmt.run(setting.key, setting.value);
                    });
                    stmt.finalize();
                }
            });
        });
    }
});

module.exports = db;