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
    password TEXT NOT NULL
  )`);

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
      // Migração: Verificar se a coluna 'name' ainda existe e renomear para 'client_name'
      db.all("PRAGMA table_info(lessons)", (err, columns) => {
        if (!err) {
          const hasName = columns.some(c => c.name === 'name');
          const hasClientName = columns.some(c => c.name === 'client_name');
          if (hasName && !hasClientName) {
            console.log("Migrando coluna 'name' para 'client_name'...");
            db.run("ALTER TABLE lessons RENAME COLUMN name TO client_name;");
          }
        }
      });
    }
  });

  // Usuário padrão: admin / 1243
  const email = 'admin';
  const password = '1243';
  
  db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
    if (!row) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, hashedPassword]);
      console.log('Usuário padrão criado com sucesso.');
    }
  });
});

module.exports = db;
