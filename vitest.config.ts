import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      SNAP_DB_NAME: 'snap-test.db',
    },
  },
})
