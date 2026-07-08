import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/db'
import { importProducts } from '@/server/services/import'

const HEADER = 'name,sku,description,category,price,stock,weight_kg'

describe('importProducts (integration)', () => {
  it('creates valid rows, skips bad ones, and merges duplicate SKUs', async () => {
    const csv = [
      HEADER,
      'A,SKU-A,desc,Cat,10.00,5,0.1',
      'B,SKU-B,desc,Cat,$20,3,',
      'Bad,SKU-C,desc,Cat,free,1,0.1',
      'Dup,SKU-A,desc2,Cat,15,9,0.2',
    ].join('\n')

    const res = await importProducts(csv)

    expect(res.ok).toBe(true)
    expect(res.created).toBe(2)
    expect(res.skipped).toBe(1)
    expect(res.duplicatesInFile).toBe(1)
    expect(await prisma.product.count()).toBe(2)

    const a = await prisma.product.findUnique({ where: { sku: 'SKU-A' } })
    expect(a?.name).toBe('Dup')
    expect(a?.priceCents).toBe(1500)
  })

  it('is idempotent: re-importing updates instead of duplicating', async () => {
    const csv = `${HEADER}\nA,SKU-A,desc,Cat,10,5,0.1`
    await importProducts(csv)
    const res = await importProducts(csv)

    expect(res.created).toBe(0)
    expect(res.updated).toBe(1)
    expect(await prisma.product.count()).toBe(1)
  })

  it('rejects a file missing expected columns', async () => {
    const res = await importProducts('name,sku,price\nA,S,1')
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Missing expected columns')
  })
})
