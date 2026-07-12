export interface Config {
  port: number
  env: 'development' | 'production'
  dbName: string
  jwtSecret: string
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export function loadConfig(overrideEnv?: Record<string, string | undefined>): Config {
  const e = overrideEnv ?? process.env

  const rawEnv = e['NODE_ENV']
  const env: Config['env'] = rawEnv === 'production' ? 'production' : 'development'

  const rawPort = e['PORT']
  const port = rawPort ? Number(rawPort) : 3000

  const dbName = e['SNAP_DB_NAME'] ?? 'snap.db'
  const jwtSecret = e['JWT_SECRET'] ?? 'snap-dev-secret-do-not-use-in-prod'

  if (env === 'production') {
    if (!rawPort) {
      throw new ConfigError('PORT is required when NODE_ENV=production')
    }
    if (Number.isNaN(port)) {
      throw new ConfigError(`PORT must be a valid number, got "${rawPort}"`)
    }
    if (!e['JWT_SECRET']) {
      throw new ConfigError('JWT_SECRET is required when NODE_ENV=production')
    }
  }

  return { port, env, dbName, jwtSecret }
}

export const config: Config = loadConfig()
