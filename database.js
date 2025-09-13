const knex = require('knex');
const path = require('path');

// Configurare bază de date SQLite modernă
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'face_recognition.db')
  },
  useNullAsDefault: true
});

// Funcție pentru inițializarea bazei de date
async function initializeDatabase() {
  try {
    console.log('🔄 Inițializez baza de date...');
    
    // Creez tabelul login
    const loginExists = await db.schema.hasTable('login');
    if (!loginExists) {
      await db.schema.createTable('login', (table) => {
        table.increments('id').primary();
        table.string('email').notNullable();
        table.string('hash').notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      await db.schema.alterTable('login', (table) => {
        table.unique('email');
      });
    }
    
    // Creez tabelul users
    const usersExists = await db.schema.hasTable('users');
    if (!usersExists) {
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').notNullable();
        table.integer('entries').defaultTo(0);
        table.timestamp('joined').defaultTo(db.fn.now());
      });
      await db.schema.alterTable('users', (table) => {
        table.unique('email');
      });
    }
    
    console.log('✅ Baza de date a fost inițializată cu succes!');
    console.log('📊 Tabele create: login, users');
    
  } catch (error) {
    console.error('❌ Eroare la inițializarea bazei de date:', error);
    throw error;
  }
}

// Funcție pentru testarea conexiunii
async function testConnection() {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Conexiunea la baza de date SQLite funcționează!');
    return true;
  } catch (error) {
    console.error('❌ Eroare la conexiunea la baza de date:', error);
    return false;
  }
}

module.exports = {
  db,
  initializeDatabase,
  testConnection
};
