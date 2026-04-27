const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.text({ type: ['text/csv', 'text/plain'], limit: '50mb' }));
app.use(session({
  secret: 'padel-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(express.static(path.join(__dirname, 'public')));

const isAuthenticated = (req, res, next) => {
  // if (req.session.userId) return next();
  // res.status(401).json({ error: 'Not authorized' });
  req.session.userId = 1; // Force user ID to 1
  return next();
};

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Tentativa de login para:', email);
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) {
      console.error('Erro no banco de dados durante login:', err.message);
      return res.status(500).json({ error: 'Erro interno' });
    }
    if (user && bcrypt.compareSync(password, user.password)) {
      console.log('Login bem-sucedido para:', email);
      req.session.userId = user.id;
      req.session.email = user.email;
      res.json({ message: 'Login successful', email: user.email });
    } else {
      console.log('Falha no login para:', email);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

app.get('/api/check-session', (req, res) => {
  req.session.userId = 1;
  res.json({ loggedIn: true, email: 'admin' });
});

app.post('/api/lessons', isAuthenticated, (req, res) => {
  const { date, coach_value, duration, client_name, model, peak_type, start_time, lesson_type, payment_method, payment_status, players_count, general_note, exception, session_status } = req.body;
  const userId = req.session.userId;
  
  console.log('Saving new lesson:', req.body); // LOG PARA DEBUG

  if (!date || !coach_value) {
    return res.status(400).json({ error: 'Date and value are required' });
  }

  db.run("INSERT INTO lessons (user_id, date, coach_value, duration, client_name, model, peak_type, start_time, lesson_type, payment_method, payment_status, players_count, general_note, exception, session_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
    [userId, date, coach_value, duration || 1, client_name || '', model || 'KG Academy', peak_type, start_time, lesson_type || 'Private', payment_method || 'App', payment_status || 'Waiting', players_count || '1-1', general_note || '', exception || 'Normal', session_status || 'Planned'], 
    function(err) {
      if (err) {
        console.error('Error saving lesson:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, date, coach_value, duration });
    }
  );
});

app.get('/api/lessons', isAuthenticated, (req, res) => {
  const userId = req.session.userId;
  db.all("SELECT *, (coach_value * duration) as total_value FROM lessons WHERE user_id = ? ORDER BY date DESC", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/lessons/:id', isAuthenticated, (req, res) => {
  const { date, coach_value, duration, client_name, model, peak_type, start_time, lesson_type, payment_method, payment_status, players_count, general_note, exception, session_status } = req.body;
  const { id } = req.params;
  const userId = req.session.userId;

  console.log('Updating lesson:', id, req.body); // LOG PARA DEBUG

  db.run("UPDATE lessons SET date = ?, coach_value = ?, duration = ?, client_name = ?, model = ?, peak_type = ?, start_time = ?, lesson_type = ?, payment_method = ?, payment_status = ?, players_count = ?, general_note = ?, exception = ?, session_status = ? WHERE id = ? AND user_id = ?", 
    [date, coach_value, duration, client_name || '', model, peak_type, start_time, lesson_type, payment_method, payment_status, players_count, general_note || '', exception || 'Normal', session_status || 'Planned', id, userId], 
    function(err) {
      if (err) {
        console.error('Error updating lesson:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Lesson updated' });
    }
  );
});

app.delete('/api/lessons/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;
  db.run("DELETE FROM lessons WHERE id = ? AND user_id = ?", [id, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Lesson deleted' });
  });
});

app.get('/api/export', isAuthenticated, (req, res) => {
  const userId = req.session.userId;
  db.all("SELECT * FROM lessons WHERE user_id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Requested order: date, start_time, peak_type, coach_value, duration, client_name, model, lesson_type, players_count, payment_method, payment_status, session_status, exception, general_note
    const csvHeaders = ['date', 'start_time', 'peak_type', 'coach_value', 'duration', 'client_name', 'model', 'lesson_type', 'players_count', 'payment_method', 'payment_status', 'session_status', 'exception', 'general_note'];
    let csv = csvHeaders.join(',') + '\n';
    
    rows.forEach(row => {
      const line = csvHeaders.map(header => {
        let val = row[header] === null || row[header] === undefined ? '' : row[header];
        // Escape commas and newlines
        if (typeof val === 'string') {
          val = val.replace(/,/g, ' ').replace(/\n/g, ' ');
        }
        return val;
      });
      csv += line.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=padel_lessons.csv');
    res.send(csv);
  });
});

app.post('/api/import', isAuthenticated, (req, res) => {
  const userId = req.session.userId;
  let csvData = '';

  if (typeof req.body === 'string') {
    csvData = req.body;
  } else if (req.body && req.body.csv) {
    csvData = req.body.csv;
  } else {
    return res.status(400).json({ error: 'Invalid data format. Expected CSV string.' });
  }

  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    return res.status(400).json({ error: 'CSV file is empty or missing headers.' });
  }

  const headers = lines[0].split(',');
  const lessons = lines.slice(1).map(line => {
    const values = line.split(',');
    const lesson = {};
    headers.forEach((header, index) => {
      lesson[header.trim()] = values[index] ? values[index].trim() : '';
    });
    return lesson;
  });

  db.serialize(() => {
    const stmt = db.prepare("INSERT INTO lessons (user_id, date, coach_value, duration, client_name, model, peak_type, start_time, lesson_type, payment_method, payment_status, players_count, general_note, exception, session_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    let errorOccurred = false;
    lessons.forEach(lesson => {
      stmt.run([
        userId,
        lesson.date,
        parseFloat(lesson.coach_value) || 0,
        parseFloat(lesson.duration) || 1,
        lesson.client_name,
        lesson.model,
        lesson.peak_type,
        lesson.start_time,
        lesson.lesson_type,
        lesson.payment_method,
        lesson.payment_status,
        lesson.players_count,
        lesson.general_note || '',
        lesson.exception || 'Normal',
        lesson.session_status || 'Planned'
      ], (err) => {
        if (err) {
          console.error('Row import error:', err);
          errorOccurred = true;
        }
      });
    });

    stmt.finalize((err) => {
      if (err || errorOccurred) {
        return res.status(500).json({ error: 'Error importing some lessons.' });
      }
      res.json({ message: `Successfully imported ${lessons.length} lessons.` });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
