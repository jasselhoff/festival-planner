import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

const dbPath = path.resolve(__dirname, '../../', config.database.path);
const dbDir = path.dirname(dbPath);

// Ensure the data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let database: SqlJsDatabase | null = null;

// Wrapper class to provide better-sqlite3-like API
class DatabaseWrapper {
  private db: SqlJsDatabase;

  constructor(sqlJsDb: SqlJsDatabase) {
    this.db = sqlJsDb;
  }

  prepare(sql: string) {
    const db = this.db;
    return {
      run(...params: any[]) {
        db.run(sql, params);
        return {
          lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0,
          changes: db.getRowsModified(),
        };
      },
      get(...params: any[]) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const columns = stmt.getColumnNames();
          const values = stmt.get();
          const row: any = {};
          columns.forEach((col, i) => {
            row[col] = values[i];
          });
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params: any[]) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows: any[] = [];
        const columns = stmt.getColumnNames();
        while (stmt.step()) {
          const values = stmt.get();
          const row: any = {};
          columns.forEach((col, i) => {
            row[col] = values[i];
          });
          rows.push(row);
        }
        stmt.free();
        return rows;
      },
    };
  }

  exec(sql: string) {
    this.db.run(sql);
  }

  pragma(pragma: string) {
    this.db.run(`PRAGMA ${pragma}`);
  }

  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export let db: DatabaseWrapper;

export async function initializeDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }

  db = new DatabaseWrapper(database);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create schema
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- Refresh tokens table
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

    -- Events table
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      creator_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_uuid ON events(uuid);
    CREATE INDEX IF NOT EXISTS idx_events_creator ON events(creator_id);

    -- Days table
    CREATE TABLE IF NOT EXISTS days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      date DATE NOT NULL,
      name TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE(event_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_days_event ON days(event_id);

    -- Stages table
    CREATE TABLE IF NOT EXISTS stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_stages_event ON stages(event_id);

    -- Acts table
    CREATE TABLE IF NOT EXISTS acts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      day_id INTEGER NOT NULL,
      stage_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      genre TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE,
      FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_acts_event ON acts(event_id);
    CREATE INDEX IF NOT EXISTS idx_acts_day ON acts(day_id);
    CREATE INDEX IF NOT EXISTS idx_acts_stage ON acts(stage_id);

    -- Groups table
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      creator_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_groups_uuid ON groups(uuid);

    -- Group members table
    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(group_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

    -- Group events table
    CREATE TABLE IF NOT EXISTS group_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      added_by INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (added_by) REFERENCES users(id),
      UNIQUE(group_id, event_id)
    );

    CREATE INDEX IF NOT EXISTS idx_group_events_group ON group_events(group_id);

    -- Selections table
    CREATE TABLE IF NOT EXISTS selections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      act_id INTEGER NOT NULL,
      priority INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (act_id) REFERENCES acts(id) ON DELETE CASCADE,
      UNIQUE(user_id, group_id, act_id)
    );

    CREATE INDEX IF NOT EXISTS idx_selections_user ON selections(user_id);
    CREATE INDEX IF NOT EXISTS idx_selections_group ON selections(group_id);
    CREATE INDEX IF NOT EXISTS idx_selections_act ON selections(act_id);
  `);

  // Save the database
  db.save();

  console.log('Database initialized successfully');
}

// Save database periodically
setInterval(() => {
  if (db) {
    db.save();
  }
}, 30000); // Every 30 seconds

// Save on process exit
process.on('beforeExit', () => {
  if (db) {
    db.save();
    console.log('Database saved');
  }
});
