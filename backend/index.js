const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('./database.js');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3001;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);
app.use(cors());
app.use(express.json());

// --- AUTHENTICATION ---

// Staff Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";
    db.get(sql, [username], (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (!user) {
            return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error comparing passwords', error: err.message });
            }
            if (result) {
                const userPayload = { id: user.id, username: user.username, role: user.role };
                const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });
                res.json({ accessToken, user: userPayload });
            } else {
                res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
            }
        });
    });
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }
        req.user = user;
        next();
    });
};

// Admin Role Middleware
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Admins only' });
    }
};


// --- PUBLIC API Endpoints (No Auth Required) ---

// 1. Mock Validation Endpoint
app.post('/api/validate',
    body('tc_kimlik').isLength({ min: 11, max: 11 }).withMessage('TC Kimlik 11 haneli olmalıdır.'),
    body('first_name').notEmpty().withMessage('İsim boş olamaz.'),
    body('last_name').notEmpty().withMessage('Soyisim boş olamaz.'),
    body('birth_year').isInt().withMessage('Doğum yılı sayı olmalıdır.'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { first_name, last_name } = req.body;

        console.log(`Doğrulandı: ${first_name} ${last_name}`);
        res.status(200).json({ message: 'Doğrulama başarılı' });
});

// Get all settings (public)
app.get('/api/settings', (req, res) => {
    const sql = "SELECT key, value FROM settings";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        // Convert rows to a key-value object
        const settings = rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.status(200).json(settings);
    });
});

// 2. Create New Visitor
app.post('/api/visitors',
    body('tc_kimlik').isLength({ min: 11, max: 11 }).withMessage('TC Kimlik 11 haneli olmalıdır.'),
    body('first_name').notEmpty().withMessage('İsim boş olamaz.'),
    body('last_name').notEmpty().withMessage('Soyisim boş olamaz.'),
    body('birth_year').isInt().withMessage('Doğum yılı sayı olmalıdır.'),
    body('reason_for_visit').notEmpty().withMessage('Ziyaret sebebi boş olamaz.'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { tc_kimlik, first_name, last_name, birth_year, reason_for_visit } = req.body;

        const checkSql = "SELECT * FROM visitors WHERE tc_kimlik = ? AND is_active = 1";
        db.get(checkSql, [tc_kimlik], (err, row) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (row) {
                return res.status(409).json({ message: 'Bu TC kimlik numarası ile zaten aktif bir ziyaretçi kaydı bulunmaktadır.' });
            }

            const newVisitor = {
                id: uuidv4(),
                tc_kimlik,
                first_name,
                last_name,
                birth_year,
                reason_for_visit,
                entry_time: new Date().toISOString(),
                exit_time: null,
                visit_duration: null,
                is_active: 1,
            };

            const insertSql = `INSERT INTO visitors (id, tc_kimlik, first_name, last_name, birth_year, reason_for_visit, entry_time, exit_time, visit_duration, is_active)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [newVisitor.id, newVisitor.tc_kimlik, newVisitor.first_name, newVisitor.last_name, newVisitor.birth_year, newVisitor.reason_for_visit, newVisitor.entry_time, newVisitor.exit_time, newVisitor.visit_duration, newVisitor.is_active];

            db.run(insertSql, params, function(err) {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                console.log(`Yeni ziyaretçi eklendi: ${newVisitor.first_name} ${newVisitor.last_name}`);
                res.status(201).json(newVisitor);
            });
        });
});


// --- PROTECTED API Endpoints (Auth Required) ---

// 3. Get Active Visitors
app.get('/api/visitors/active', authenticateToken, (req, res) => {
    const sql = "SELECT * FROM visitors WHERE is_active = 1 ORDER BY entry_time DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.status(200).json(rows);
    });
});

// 4. Get Past Visitors
app.get('/api/visitors/past', authenticateToken, (req, res) => {
    const sql = "SELECT * FROM visitors WHERE is_active = 0 ORDER BY exit_time DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.status(200).json(rows);
    });
});

// 5. Deactivate Visitor (Checkout)
app.put('/api/visitors/:id/deactivate', authenticateToken, (req, res) => {
    const { id } = req.params;

    const findSql = "SELECT * FROM visitors WHERE id = ?";
    db.get(findSql, [id], (err, visitor) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (!visitor) {
            return res.status(404).json({ message: 'Ziyaretçi bulunamadı.' });
        }
        if (!visitor.is_active) {
            return res.status(400).json({ message: 'Ziyaretçi zaten çıkış yapmış.' });
        }

        const exitTime = new Date();
        const entryTime = new Date(visitor.entry_time);
        const durationMs = exitTime - entryTime;
        const durationMins = Math.round(durationMs / 60000);

        const updatedVisitor = {
            ...visitor,
            is_active: 0,
            exit_time: exitTime.toISOString(),
            visit_duration: `${durationMins} dakika`,
        };

        const updateSql = `UPDATE visitors SET 
                           is_active = ?,
                           exit_time = ?,
                           visit_duration = ?
                           WHERE id = ?`;
        const params = [updatedVisitor.is_active, updatedVisitor.exit_time, updatedVisitor.visit_duration, id];

        db.run(updateSql, params, function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            console.log(`Ziyaretçi çıkış yaptı: ${visitor.first_name} ${visitor.last_name}`);
            res.status(200).json(updatedVisitor);
        });
    });
});


// 6. Get Visitor Metrics
app.get('/api/metrics/visitors', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    console.log("Metrics: today string for query:", today); // DEBUG LOG

    // Query 1: Total visitors today
    const sqlTodayVisitors = `SELECT COUNT(*) as total FROM visitors WHERE DATE(entry_time) = DATE(?)`;
    
    // Query 2: Active visitors
    const sqlActiveVisitors = `SELECT COUNT(*) as total FROM visitors WHERE is_active = 1`;

    // Query 3: Average visit duration for past visitors
    // Note: visit_duration is stored as "X dakika", so we need to parse it.
    const sqlAvgDuration = `SELECT visit_duration FROM visitors WHERE is_active = 0 AND visit_duration IS NOT NULL AND visit_duration != ''`;

    let metrics = {};

    db.get(sqlTodayVisitors, [today], (err, rowToday) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        metrics.visitorsToday = rowToday.total;
        console.log("Metrics: visitorsToday query result:", rowToday.total); // DEBUG LOG

        db.get(sqlActiveVisitors, [], (err, rowActive) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            metrics.activeVisitors = rowActive.total;

            db.all(sqlAvgDuration, [], (err, rowsDuration) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                console.log("Metrics: Raw visit_duration rows:", rowsDuration); // DEBUG LOG

                let totalDuration = 0;
                let countDuration = 0;
                rowsDuration.forEach(row => {
                    const match = row.visit_duration.match(/(\d+)\s*dakika/);
                    console.log(`Metrics: Parsing duration for row: ${row.visit_duration}, Match: ${JSON.stringify(match)}`); // DEBUG LOG
                    if (match && match[1]) {
                        totalDuration += parseInt(match[1], 10);
                        countDuration++;
                    }
                });

                metrics.averageVisitDurationMinutes = countDuration > 0 ? Math.round(totalDuration / countDuration) : 0;
                console.log(`Metrics: totalDuration: ${totalDuration}, countDuration: ${countDuration}, average: ${metrics.averageVisitDurationMinutes}`); // DEBUG LOG
                
                res.status(200).json(metrics);
            });
        });
    });
});


// --- ADMIN API Endpoints (Admin Role Required) ---

// Get all users
app.get('/api/users', authenticateToken, isAdmin, (req, res) => {
    let { search, role, page, limit } = req.query;

    // Robust parsing for page and limit
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    let countSql = "SELECT COUNT(*) as total FROM users";
    let usersSql = "SELECT id, username, role, created_at FROM users";
    const whereClauses = [];
    const queryParams = []; // Parameters for both count and users query

    if (search) {
        whereClauses.push("(username LIKE ?)");
        queryParams.push(`%${search}%`);
    }
    if (role && (role === 'admin' || role === 'staff')) {
        whereClauses.push("role = ?");
        queryParams.push(role);
    }

    if (whereClauses.length > 0) {
        countSql += " WHERE " + whereClauses.join(" AND ");
        usersSql += " WHERE " + whereClauses.join(" AND ");
    }

    // Execute count query first
    db.get(countSql, queryParams, (err, countRow) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        const totalUsers = countRow.total;
        const totalPages = Math.ceil(totalUsers / limit);

        // Add pagination parameters for the users query
        const usersQueryParams = [...queryParams]; // Clone queryParams
        usersSql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        usersQueryParams.push(limit);
        usersQueryParams.push((page - 1) * limit);

        db.all(usersSql, usersQueryParams, (err, rows) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            res.status(200).json({
                users: rows,
                pagination: {
                    totalUsers,
                    totalPages,
                    currentPage: page,
                    perPage: limit
                }
            });
        });
    });
});

// Create a new user
app.post('/api/users', authenticateToken, isAdmin, 
    body('username').notEmpty().withMessage('Username is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    body('role').isIn(['admin', 'staff']).withMessage('Invalid role.'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password, role } = req.body;

        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ message: 'Error hashing password', error: err.message });
            }

            const newUser = {
                id: uuidv4(),
                username,
                password: hashedPassword,
                role,
                created_at: new Date().toISOString()
            };

            const insertSql = `INSERT INTO users (id, username, password, role, created_at)
                               VALUES (?, ?, ?, ?, ?)`;
            const params = [newUser.id, newUser.username, newUser.password, newUser.role, newUser.created_at];

            db.run(insertSql, params, function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ message: 'Username already exists.' });
                    }
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                const { password, ...userWithoutPassword } = newUser;
                res.status(201).json(userWithoutPassword);
            });
        });
});

// Delete a user
app.delete('/api/users/:id', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
        return res.status(400).json({ message: 'Admin users cannot delete themselves.' });
    }

    const sql = "DELETE FROM users WHERE id = ?";
    db.run(sql, [id], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({ message: 'User deleted successfully.' });
    });
});

// Update a user
app.put('/api/users/:id', authenticateToken, isAdmin,
    body('username').optional().notEmpty().withMessage('Username cannot be empty.'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    body('role').optional().isIn(['admin', 'staff']).withMessage('Invalid role.'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { username, password, role } = req.body;

        // Prevent admin from changing their own role to non-admin or deleting themselves
        if (req.user.id === id && role && role !== 'admin') {
            return res.status(400).json({ message: 'Admin users cannot change their own role to non-admin.' });
        }

        let updateSql = "UPDATE users SET ";
        const params = [];
        const fields = [];

        if (username !== undefined) {
            fields.push("username = ?");
            params.push(username);
        }
        if (role !== undefined) {
            fields.push("role = ?");
            params.push(role);
        }

        if (password !== undefined) {
            const saltRounds = 10;
            bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).json({ message: 'Error hashing password', error: err.message });
                }
                fields.push("password = ?");
                params.push(hashedPassword);
                
                updateSql += fields.join(", ") + " WHERE id = ?";
                params.push(id);

                db.run(updateSql, params, function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            return res.status(409).json({ message: 'Username already exists.' });
                        }
                        return res.status(500).json({ message: 'Database error', error: err.message });
                    }
                    if (this.changes === 0) {
                        return res.status(404).json({ message: 'User not found.' });
                    }
                    res.status(200).json({ message: 'User updated successfully.' });
                });
            });
        } else {
            if (fields.length === 0) {
                return res.status(400).json({ message: 'No fields to update.' });
            }
            updateSql += fields.join(", ") + " WHERE id = ?";
            params.push(id);

            db.run(updateSql, params, function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ message: 'Username already exists.' });
                    }
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'User not found.' });
                }
                res.status(200).json({ message: 'User updated successfully.' });
            });
        }
    }
);

// Update settings (admin only)
app.put('/api/settings', authenticateToken, isAdmin, (req, res) => {
    const { kvkk_text, aydinlatma_text } = req.body;

    if (kvkk_text === undefined || aydinlatma_text === undefined) {
        return res.status(400).json({ message: 'Both kvkk_text and aydinlatma_text are required.' });
    }

    const updateSql = "UPDATE settings SET value = ? WHERE key = ?";
    
    db.serialize(() => {
        db.run(updateSql, [kvkk_text, 'kvkk_text'], function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error while updating kvkk_text', error: err.message });
            }
        });

        db.run(updateSql, [aydinlatma_text, 'aydinlatma_text'], function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error while updating aydinlatma_text', error: err.message });
            }
        });

        res.status(200).json({ message: 'Settings updated successfully.' });
    });
});


// Basic route to check if server is running
app.get('/', (req, res) => {
  res.send("Ziyaretçi Kayıt Sistemi Backend'i çalışıyor!");
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu 0.0.0.0:${PORT} adresinde dinleniyor`);
});
