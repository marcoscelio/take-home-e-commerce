import Papa from 'papaparse'
import { CATEGORY_FALLBACK } from './validations'

export type NormalizedProduct = {
  name: string
  sku: string
  description: string
  category: string
  priceCents: number
  stock: number
  weightKg: number | null
}

export type RowError = { row: number; sku: string; reason: string }

export type ParseResult = {
  products: NormalizedProduct[]
  errors: RowError[]
  duplicatesInFile: number
}

const EXPECTED = ['name', 'sku', 'description', 'category', 'price', 'stock', 'weight_kg']

function parsePriceCents(raw: string): number | null {
  const s = (raw ?? '').trim().replace(/[$,\s]/g, '')
  if (s === '') return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

function parseStock(raw: string): number | null {
  const s = (raw ?? '').trim()
  if (s === '') return 0
  const n = Number(s)
  if (!Number.isInteger(n) || n < 0) return null
  return n
}

function parseWeight(raw: string): number | null {
  const s = (raw ?? '').trim()
  if (s === '') return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function parseProductsCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  const products: NormalizedProduct[] = []
  const errors: RowError[] = []
  const bySku = new Map<string, number>()
  let duplicatesInFile = 0

  parsed.data.forEach((raw, i) => {
    const line = i + 2
    const name = (raw.name ?? '').trim()
    const sku = (raw.sku ?? '').trim()

    if (!name && !sku) return
    if (!name) {
      errors.push({ row: line, sku, reason: 'Missing name' })
      return
    }
    if (!sku) {
      errors.push({ row: line, sku: '', reason: `Missing SKU for "${name}"` })
      return
    }

    const priceCents = parsePriceCents(raw.price)
    if (priceCents === null) {
      errors.push({ row: line, sku, reason: `Invalid price "${raw.price ?? ''}"` })
      return
    }

    const stock = parseStock(raw.stock)
    if (stock === null) {
      errors.push({ row: line, sku, reason: `Invalid stock "${raw.stock ?? ''}"` })
      return
    }

    const product: NormalizedProduct = {
      name,
      sku,
      description: (raw.description ?? '').trim(),
      category: (raw.category ?? '').trim() || CATEGORY_FALLBACK,
      priceCents,
      stock,
      weightKg: parseWeight(raw.weight_kg),
    }

    if (bySku.has(sku)) {
      duplicatesInFile += 1
      products[bySku.get(sku)!] = product
    } else {
      bySku.set(sku, products.length)
      products.push(product)
    }
  })

  return { products, errors, duplicatesInFile }
}

export function hasExpectedHeaders(text: string): boolean {
  const first = text.split(/\r?\n/)[0] ?? ''
  const headers = first.split(',').map((h) => h.trim().toLowerCase())
  return EXPECTED.every((h) => headers.includes(h))
}
