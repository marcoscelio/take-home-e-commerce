import { prisma } from '@/lib/db'
import { parseProductsCsv, hasExpectedHeaders, type NormalizedProduct, type RowError } from '@/lib/csv'

const BATCH_SIZE = 500

export type ImportSummary = {
  ok: boolean
  error?: string
  created: number
  updated: number
  skipped: number
  duplicatesInFile: number
  errors: RowError[]
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function empty(error: string): ImportSummary {
  return { ok: false, error, created: 0, updated: 0, skipped: 0, duplicatesInFile: 0, errors: [] }
}

export async function importProducts(text: string): Promise<ImportSummary> {
  if (!text || !text.trim()) return empty('The file is empty')
  if (!hasExpectedHeaders(text))
    return empty('Missing expected columns: name, sku, description, category, price, stock, weight_kg')

  const { products, errors, duplicatesInFile } = parseProductsCsv(text)

  const existingSet = new Set<string>()
  for (const batch of chunk(products.map((p) => p.sku), BATCH_SIZE)) {
    const rows = await prisma.product.findMany({ where: { sku: { in: batch } }, select: { sku: true } })
    for (const r of rows) existingSet.add(r.sku)
  }

  let created = 0
  let updated = 0

  for (const batch of chunk(products, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((p: NormalizedProduct) => {
        if (existingSet.has(p.sku)) {
          updated += 1
          return prisma.product.update({ where: { sku: p.sku }, data: p })
        }
        created += 1
        return prisma.product.create({ data: p })
      }),
    )
  }

  return { ok: true, created, updated, skipped: errors.length, duplicatesInFile, errors }
}
