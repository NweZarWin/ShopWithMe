const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const app = express();
const port = 3001;
const pbkdf2 = promisify(crypto.pbkdf2);

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'signup'
});

db.connect((error) => {
  if (error) {
    console.error('Could not connect to MySQL:', error.message);
    return;
  }
  console.log('Connected to MySQL.');
});

app.post('/signup', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  db.query('SELECT email FROM login WHERE email = ?', [email], async (error, users) => {
    if (error) {
      console.error('Could not check existing account:', error.message);
      return res.status(500).json({ error: 'Could not create account.' });
    }

    if (users.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    try {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = await pbkdf2(password, salt, 100000, 64, 'sha512');
      const passwordHash = `${salt}:${hash.toString('hex')}`;

      db.query(
        'INSERT INTO login (name, email, password) VALUES (?, ?, ?)',
        [name, email, passwordHash],
        (insertError, result) => {
          if (insertError) {
            console.error('Could not create account:', insertError.message);
            return res.status(500).json({ error: 'Could not create account.' });
          }

          return res.status(201).json({
            message: 'Account created successfully.',
            userId: result.insertId
          });
        }
      );
    } catch (hashError) {
      console.error('Could not secure password:', hashError.message);
      return res.status(500).json({ error: 'Could not create account.' });
    }
  });
});

app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});

// app.listen(80443, () => {console.log("listening")})