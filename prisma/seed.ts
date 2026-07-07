import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { parseProductsCsv } from '../src/lib/csv'

const prisma = new PrismaClient()

async function main() {
  const csvPath = join(process.cwd(), 'data', 'products.csv')
  if (!existsSync(csvPath)) {
    console.log('No seed CSV found at data/products.csv, skipping seed.')
    return
  }

  const existingCount = await prisma.product.count()
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} products, skipping seed.`)
    return
  }

  const text = readFileSync(csvPath, 'utf-8')
  const { products, errors, duplicatesInFile } = parseProductsCsv(text)

  let created = 0
  let updated = 0
  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } })
    if (existing) {
      await prisma.product.update({ where: { sku: p.sku }, data: p })
      updated += 1
    } else {
      await prisma.product.create({ data: p })
      created += 1
    }
  }

  console.log(
    `Seed complete — created: ${created}, updated: ${updated}, skipped: ${errors.length}, duplicates in file: ${duplicatesInFile}`,
  )
  if (errors.length) console.log('Skipped rows:', errors.map((e) => `line ${e.row}: ${e.reason}`).join(' | '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
