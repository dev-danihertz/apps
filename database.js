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
      // Sistema de Migração Robusto
      db.all("PRAGMA table_info(lessons)", (err, columns) => {
        if (!err) {
          const colNames = columns.map(c => c.name);
          
          // 1. Migrar 'name' para 'client_name' se necessário
          if (colNames.includes('name') && !colNames.includes('client_name')) {
            console.log("Migrando 'name' -> 'client_name'...");
            db.run("ALTER TABLE lessons RENAME COLUMN name TO client_name;");
          }

          // 2. Adicionar colunas faltantes uma por uma
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
            if (!colNames.includes(col.name) && col.name !== 'client_name') { // client_name já tratado no rename
              console.log(`Adicionando coluna faltante: ${col.name}...`);
              db.run(`ALTER TABLE lessons ADD COLUMN ${col.name} ${col.type};`);
            }
          });
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
