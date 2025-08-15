const sqlite3 = require('sqlite3').verbose();

function criarDB(caminho) {
  const db = new sqlite3.Database(caminho);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS imagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        indice INTEGER NOT NULL UNIQUE,
        caminho TEXT NOT NULL
      )
    `);
  });

  return db;
}

module.exports = { criarDB };
