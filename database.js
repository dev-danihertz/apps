const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// No Fly.io, usaremos o volume montado em /data/padel.db definido no fly.toml
const dbPath = process.env.DATABASE_URL || path.resolve(__dirname, 'padel.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Tabela de usuários
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    reset_token TEXT,
    reset_expiry INTEGER
  )`, (err) => {
    if (!err) {
      db.all("PRAGMA table_info(users)", (err, columns) => {
        if (!err) {
          const colNames = columns.map(c => c.name);
          const tasks = [];
          if (!colNames.includes('name')) tasks.push("ALTER TABLE users ADD COLUMN name TEXT;");
          if (!colNames.includes('reset_token')) tasks.push("ALTER TABLE users ADD COLUMN reset_token TEXT;");
          if (!colNames.includes('reset_expiry')) tasks.push("ALTER TABLE users ADD COLUMN reset_expiry INTEGER;");

          const runTasks = (idx) => {
            if (idx < tasks.length) {
              console.log(`Executando migração na tabela users: ${tasks[idx]}`);
              db.run(tasks[idx], (err) => {
                if (err) console.error("Erro na migração:", err.message);
                runTasks(idx + 1);
              });
            } else {
              seedDefaultUser();
            }
          };
          runTasks(0);
        }
      });
    }
  });

  function seedDefaultUser() {
    const defaultEmail = 'daniucs@gmail.com';
    const defaultPassword = '1243';
    const defaultName = 'Dani';
    
    db.get("SELECT id FROM users WHERE email = ? OR email = 'admin'", [defaultEmail], (err, row) => {
      if (!row) {
        const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
        db.run("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", [defaultEmail, hashedPassword, defaultName]);
        console.log('Usuário padrão criado com sucesso.');
      } else if (row) {
        db.run("UPDATE users SET email = ?, name = ? WHERE id = ?", [defaultEmail, defaultName, row.id]);
      }
    });
  }

  // Tabela de aulas
  db.run(`CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    coach_value REAL NOT NULL,
    duration REAL DEFAULT 1,
    client_name TEXT,
    model TEXT DEFAULT 'KG Academy',
    peak_type TEXT,
    start_time TEXT,
    lesson_type TEXT DEFAULT 'Private',
    payment_method TEXT,
    payment_status TEXT DEFAULT 'Waiting',
    players_count TEXT DEFAULT '1-1',
    general_note TEXT,
    exception TEXT DEFAULT 'Normal',
    session_status TEXT DEFAULT 'Planned',
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (!err) {
      db.all("PRAGMA table_info(lessons)", (err, columns) => {
        if (!err) {
          const colNames = columns.map(c => c.name);
          if (colNames.includes('name') && !colNames.includes('client_name')) {
            db.run("ALTER TABLE lessons RENAME COLUMN name TO client_name;");
          }

          const requiredColumns = [
            { name: 'client_name', type: 'TEXT' },
            { name: 'peak_type', type: 'TEXT' },
            { name: 'start_time', type: 'TEXT' },
            { name: 'lesson_type', type: 'TEXT DEFAULT "Private"' },
            { name: 'players_count', type: 'TEXT DEFAULT "1-1"' },
            { name: 'exception', type: 'TEXT DEFAULT "Normal"' },
            { name: 'session_status', type: 'TEXT DEFAULT "Planned"' }
          ];

          requiredColumns.forEach(col => {
            if (!colNames.includes(col.name) && col.name !== 'client_name') {
              db.run(`ALTER TABLE lessons ADD COLUMN ${col.name} ${col.type};`);
            }
          });
        }
      });
    }
  });

  // Tabela de métodos de pagamento
  db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (!err) {
      db.get("SELECT COUNT(*) as count FROM payment_methods", (err, row) => {
        if (row && row.count === 0) {
          const methods = ['Bank Transfer', 'Cash', 'Card', 'App', 'Voucher', 'Membership', 'Kevin Student', 'Playtomic', 'Myself'];
          methods.forEach(m => {
            db.run("INSERT INTO payment_methods (user_id, name) VALUES (1, ?)", [m]);
          });
        }
      });
    }
  });

  // Tabela de Coach Rates
  db.run(`CREATE TABLE IF NOT EXISTS coach_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_type TEXT NOT NULL,
    players_count TEXT NOT NULL,
    hourly_rate REAL NOT NULL,
    UNIQUE(user_id, lesson_type, players_count),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (!err) {
      db.get("SELECT COUNT(*) as count FROM coach_rates", (err, row) => {
        if (row && row.count === 0) {
          const types = ['Open', 'Private'];
          const players = ['1-1', '1-2', '1-3', '1-4'];
          types.forEach(type => {
            players.forEach(player => {
              const defaultRate = type === 'Private' ? 25 : 20;
              db.run("INSERT INTO coach_rates (user_id, lesson_type, players_count, hourly_rate) VALUES (1, ?, ?, ?)", [type, player, defaultRate]);
            });
          });
        }
      });
    }
  });
});

module.exports = db;
