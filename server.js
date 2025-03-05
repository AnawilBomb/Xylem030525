const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const multer = require('multer');
const app = express();
const jwt = require('jsonwebtoken'); // ต้องติดตั้ง jsonwebtoken ก่อน
const cookieParser = require('cookie-parser'); // ต้องติดตั้ง cookie-parser ก่อน
const bcrypt = require('bcrypt'); // ต้องติดตั้ง bcrypt ก่อน

// MySQL Connection Pool
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'Test',
    password: '1234',
    database: 'xylemdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// ค่า secret สำหรับ JWT
const jwtSecret = 'xylem-app-secret-2025';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname))); // Serve static files from current directory

// CORS Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

app.post('/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const connection = await pool.getConnection();
        
        // ค้นหาผู้ใช้งานจาก username
        const [users] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        connection.release();
        
        if (users.length === 0) {
            return res.json({ login: false, message: 'User not found' });
        }
        
        const user = users[0];
        
        // ตรวจสอบประเภทข้อมูลก่อนเปรียบเทียบ
        if (typeof password !== 'string' || typeof user.password !== 'string') {
            console.log('Password types:', {
                requestPassword: typeof password,
                dbPassword: typeof user.password
            });
            // ถ้าไม่ใช่ string ให้ใช้วิธีเปรียบเทียบโดยตรง
            const passwordMatch = password == user.password;
            if (!passwordMatch) {
                return res.json({ login: false, message: 'Invalid password' });
            }
        } else {
            // ถ้าเป็น string ทั้งคู่ ให้ใช้ bcrypt
            try {
                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) {
                    return res.json({ login: false, message: 'Invalid password' });
                }
            } catch (bcryptError) {
                console.error('bcrypt error:', bcryptError);
                // ถ้า bcrypt มีปัญหา ลองใช้วิธีเปรียบเทียบโดยตรง
                const passwordMatch = password === user.password;
                if (!passwordMatch) {
                    return res.json({ login: false, message: 'Invalid password' });
                }
            }
        }
        
        // สร้าง JWT token - ใช้เฉพาะข้อมูลที่มีอยู่จริง
        const token = jwt.sign(
            { id: user.user_id, username: user.username },
            jwtSecret,
            { expiresIn: '1d' }
        );
        
        // ส่ง token กลับไปเก็บใน cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 วัน
        });
        
        res.json({ login: true, message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ login: false, error: error.message });
    }
});

// Route สำหรับ logout
app.get('/users/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logout successful' });
});

// Route สำหรับสมัครสมาชิกใหม่
app.post('/users/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const connection = await pool.getConnection();
        
        // ตรวจสอบว่ามี username ซ้ำหรือไม่
        const [existingUsers] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUsers.length > 0) {
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'username already exists' 
            });
        }
        
        // บันทึกข้อมูลสมาชิกใหม่
        const [result] = await connection.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, password]
        );
        
        connection.release();
        
        res.json({ 
            success: true, 
            message: 'Registration successful',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ตรวจสอบสถานะการล็อกอิน (middleware)
const authenticateUser = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ authenticated: false, message: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT verification error:', error);
        res.status(401).json({ authenticated: false, message: 'Invalid token' });
    }
};

// Routes ที่ต้องการการยืนยันตัวตน
app.get('/users/profile', authenticateUser, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [users] = await connection.execute(
            'SELECT user_id, username FROM users WHERE user_id = ?',
            [req.user.id]
        );
        
        connection.release();
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user: users[0] });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API ข้อมูล QA

app.post('/api/save-chat', async (req, res) => {
    console.log('Received data:', req.body);
    try {
        const { question, answer, related_plant_id } = req.body;
        
        const connection = await pool.getConnection();
        const query = `INSERT INTO qa_data (Question, Answer, related_plant_id) 
                      VALUES (?, ?, ?)`;
        
        const [result] = await connection.execute(query, [question, answer, related_plant_id]);
        console.log('Database result:', result);
        connection.release();
        
        res.json({ success: true, message: 'Chat saved successfully' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET all questions
app.get('/api/get-questions', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM qa_data ORDER BY QA_ID DESC');
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE question
app.post('/api/update-question', async (req, res) => {
    try {
        const { qa_id, question, answer, related_plant_id } = req.body;
        const connection = await pool.getConnection();
        
        await connection.execute(
            'UPDATE qa_data SET Question = ?, Answer = ?, related_plant_id = ? WHERE QA_ID = ?',
            [question, answer, related_plant_id, qa_id]
        );
        
        connection.release();
        res.json({ success: true });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE question
app.post('/api/delete-question', async (req, res) => {
    try {
        const { qa_id } = req.body;
        const connection = await pool.getConnection();
        
        await connection.execute('DELETE FROM qa_data WHERE QA_ID = ?', [qa_id]);
        
        connection.release();
        res.json({ success: true });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ADD new question
app.post('/api/add-question', async (req, res) => {
    try {
        const { question, answer, related_plant_id } = req.body;
        const connection = await pool.getConnection();
        
        const [result] = await connection.execute(
            'INSERT INTO qa_data (Question, Answer, related_plant_id) VALUES (?, ?, ?)',
            [question, answer, related_plant_id]
        );
        
        const [newQuestion] = await connection.execute(
            'SELECT * FROM qa_data WHERE QA_ID = ?',
            [result.insertId]
        );
        
        connection.release();
        res.json(newQuestion[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/get-plants', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM plants ORDER BY plant_id DESC');
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE plant
app.post('/api/update-plant', async (req, res) => {
    try {
        const { plant_id, plant_name, scientific_name, description } = req.body;
        const connection = await pool.getConnection();
        
        await connection.execute(
            'UPDATE plants SET plant_name = ?, scientific_name = ?, description = ? WHERE plant_id = ?',
            [plant_name, scientific_name, description, plant_id]
        );
        
        connection.release();
        res.json({ success: true });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE plant
app.post('/api/delete-plant', async (req, res) => {
    try {
        const { plant_id } = req.body;
        const connection = await pool.getConnection();
        
        await connection.execute('DELETE FROM plants WHERE plant_id = ?', [plant_id]);
        
        connection.release();
        res.json({ success: true });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ADD new plant
app.post('/api/add-plant', async (req, res) => {
    try {
        const { plant_name, scientific_name, description } = req.body;
        const connection = await pool.getConnection();
        
        const [result] = await connection.execute(
            'INSERT INTO plants (plant_name, scientific_name, description) VALUES (?, ?, ?)',
            [plant_name, scientific_name, description]
        );
        
        const [newPlant] = await connection.execute(
            'SELECT * FROM plants WHERE plant_id = ?',
            [result.insertId]
        );
        
        connection.release();
        res.json(newPlant[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Get all documents
app.get('/api/get-documents', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute(
            'SELECT document_id, filename, filesize, related_plant_id, upload_at FROM documents ORDER BY upload_at DESC'
        );
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload a new document
app.post('/api/upload-document', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { buffer, originalname, size } = req.file;
        const related_plant_id = req.body.related_plant_id || null;
        
        // Ensure proper UTF-8 encoding for filename
        const encodedFilename = Buffer.from(originalname, 'latin1').toString('utf8');
        
        const connection = await pool.getConnection();
        const [result] = await connection.execute(
            'INSERT INTO documents (content, filename, filesize, related_plant_id, upload_at) VALUES (?, ?, ?, ?, NOW())',
            [buffer, encodedFilename, size, related_plant_id]
        );
        
        connection.release();
        
        res.json({ 
            success: true, 
            message: 'Document uploaded successfully',
            document_id: result.insertId
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download a document
app.get('/api/download-document/:id', async (req, res) => {
    try {
        const documentId = req.params.id;
        const connection = await pool.getConnection();
        
        const [documents] = await connection.execute(
            'SELECT content, filename FROM documents WHERE document_id = ?',
            [documentId]
        );
        
        connection.release();
        
        if (documents.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        const document = documents[0];
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`);
        
        // Send the PDF content
        res.send(document.content);
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a document
app.post('/api/delete-document', async (req, res) => {
    try {
        const { document_id } = req.body;
        const connection = await pool.getConnection();
        
        await connection.execute(
            'DELETE FROM documents WHERE document_id = ?', 
            [document_id]
        );
        
        connection.release();
        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route สำหรับตรวจสอบสถานะการล็อกอิน
app.get('/users/check-auth', async (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.json({ authenticated: false });
    }
    
    try {
        // ตรวจสอบความถูกต้องของ token
        const decoded = jwt.verify(token, jwtSecret);
        
        // ดึงข้อมูลผู้ใช้จาก database
        const connection = await pool.getConnection();
        const [users] = await connection.execute(
            'SELECT user_id, username FROM users WHERE user_id = ?',
            [decoded.id]
        );
        connection.release();
        
        if (users.length === 0) {
            return res.json({ authenticated: false });
        }
        
        // ส่งข้อมูลกลับไป
        res.json({ 
            authenticated: true,
            user: users[0]
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.json({ authenticated: false });
    }
});

// เพิ่ม route สำหรับเปลี่ยนทิศทางการเข้าถึงหน้าแรก
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});