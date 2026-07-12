import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from '../../shared/db.js'
import { config } from '../../config.js'

const SALT_ROUNDS = 10

export interface AuthResult {
  token: string
  user: { id: number; email: string; name: string }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function register(email: string, password: string, name: string): AuthResult {
  const normalized = normalizeEmail(email)

  if (!password || password.length < 6) {
    throw new AuthError('Password must be at least 6 characters')
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized)
  if (existing) {
    throw new AuthError('Email already registered')
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS)
  const result = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(normalized, passwordHash, name)

  const user = { id: Number(result.lastInsertRowid), email: normalized, name }
  const token = jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: '24h' })

  return { token, user }
}

export function login(email: string, password: string): AuthResult {
  const normalized = normalizeEmail(email)

  const db = getDb()
  const row = db.prepare('SELECT id, email, password_hash, name FROM users WHERE email = ?').get(normalized) as { id: number; email: string; password_hash: string; name: string } | undefined

  if (!row) {
    throw new AuthError('Invalid email or password')
  }

  if (!bcrypt.compareSync(password, row.password_hash)) {
    throw new AuthError('Invalid email or password')
  }

  const user = { id: row.id, email: row.email, name: row.name }
  const token = jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: '24h' })

  return { token, user }
}
