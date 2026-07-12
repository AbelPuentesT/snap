import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { config } from '../config.js'

const DB_PATH = path.resolve(process.cwd(), 'data', config.dbName)

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initDb(): void {
  const conn = getDb()
  conn.exec(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code TEXT NOT NULL UNIQUE,
      original_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      user_id INTEGER REFERENCES users(id)
    )
  `)

  conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  conn.exec(`
    CREATE TABLE IF NOT EXISTS clicks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      url_id      INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
      clicked_at  TEXT NOT NULL DEFAULT (datetime('now')),
      ip_address  TEXT,
      user_agent  TEXT,
      referer     TEXT
    )
  `)

  conn.exec(`CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id)`)
  conn.exec(`CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON clicks(url_id)`)
  conn.exec(`CREATE INDEX IF NOT EXISTS idx_clicks_url_clicked ON clicks(url_id, clicked_at)`)

  try {
    conn.exec(`ALTER TABLE urls ADD COLUMN user_id INTEGER REFERENCES users(id)`)
  } catch {
    // ya existe — migración para bases creadas antes de este cambio
  }
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
