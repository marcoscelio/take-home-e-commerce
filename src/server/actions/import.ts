'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { parseProductsCsv, hasExpectedHeaders, type RowError } from '@/lib/csv'

export type ImportSummary = {
  ok: boolean
  error?: string
  created: number
  updated: number
  skipped: number
  duplicatesInFile: number
  errors: RowError[]
}

export async function importCsvAction(text: string): Promise<ImportSummary> {
  if (!text || !text.trim())
    return { ok: false, error: 'The file is empty', created: 0, updated: 0, skipped: 0, duplicatesInFile: 0, errors: [] }

  if (!hasExpectedHeaders(text))
    return {
      ok: false,
      error: 'Missing expected columns: name, sku, description, category, price, stock, weight_kg',
      created: 0,
      updated: 0,
      skipped: 0,
      duplicatesInFile: 0,
      errors: [],
    }

  const { products, errors, duplicatesInFile } = parseProductsCsv(text)

  const skus = products.map((p) => p.sku)
  const existing = await prisma.product.findMany({ where: { sku: { in: skus } }, select: { sku: true } })
  const existingSet = new Set(existing.map((e) => e.sku))

  let created = 0
  let updated = 0

  await prisma.$transaction(
    products.map((p) => {
      if (existingSet.has(p.sku)) {
        updated += 1
        return prisma.product.update({ where: { sku: p.sku }, data: p })
      }
      created += 1
      return prisma.product.create({ data: p })
    }),
  )

  revalidatePath('/admin/products')
  revalidatePath('/')

  return { ok: true, created, updated, skipped: errors.length, duplicatesInFile, errors }
}
