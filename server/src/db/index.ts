import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL || './data/todays-meal.db';

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initDatabase(): void {
  const database = getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      steps TEXT NOT NULL,
      cooking_time INTEGER,
      calories INTEGER,
      protein REAL,
      fat REAL,
      carbs REAL,
      image_url TEXT,
      source_url TEXT,
      source_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      recipe_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id),
      UNIQUE(user_id, recipe_id)
    );

    CREATE TABLE IF NOT EXISTS user_ingredients (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ingredient TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      preference_type TEXT NOT NULL,
      preference_key TEXT NOT NULL,
      preference_value TEXT NOT NULL,
      frequency INTEGER DEFAULT 1,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, preference_type, preference_key)
    );

    CREATE TABLE IF NOT EXISTS recipe_knowledge_base (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      ingredients TEXT NOT NULL,
      steps TEXT NOT NULL,
      cooking_time INTEGER,
      calories INTEGER,
      protein REAL,
      fat REAL,
      carbs REAL,
      cuisine_type TEXT,
      tags TEXT,
      difficulty TEXT,
      source TEXT,
      image_url TEXT,
      source_url TEXT,
      source_name TEXT,
      embedding TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_preferences_type ON user_preferences(preference_type);
    CREATE INDEX IF NOT EXISTS idx_recipe_kb_cuisine ON recipe_knowledge_base(cuisine_type);
    CREATE INDEX IF NOT EXISTS idx_recipe_kb_cooking_time ON recipe_knowledge_base(cooking_time);
  `);

  console.log('📦 データベースを初期化しました');
}

