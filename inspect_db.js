const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'padel.db');
const db = new sqlite3.Database(dbPath);

console.log('--- Database Inspection ---');

db.serialize(() => {
  db.all("SELECT id, email FROM users", [], (err, rows) => {
    console.log('Users in DB:');
    console.table(rows);
  });

  db.all("SELECT * FROM payment_methods", [], (err, rows) => {
    console.log('Payment Methods in DB:');
    console.table(rows);
  });
});

setTimeout(() => db.close(), 1000);
