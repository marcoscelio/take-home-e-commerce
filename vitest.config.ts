import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

const TEST_DB = `file:${resolve(process.cwd(), 'data/test.db')}`

export default defineConfig({
  resolve: {
    alias: { '@': resolve(process.cwd(), 'src') },
  },
  test: {
    environment: 'node',
    env: { DATABASE_URL: TEST_DB },
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
    include: ['tests/**/*.test.ts'],
  },
})
