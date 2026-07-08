import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { rmSync } from 'node:fs'

export default function setup() {
  const dbPath = resolve(process.cwd(), 'data/test.db')
  for (const f of [dbPath, `${dbPath}-journal`]) {
    try {
      rmSync(f)
    } catch {
      void 0
    }
  }
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: 'ignore',
  })
}
