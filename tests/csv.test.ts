import { describe, it, expect } from 'vitest'
import { parseProductsCsv, hasExpectedHeaders } from '@/lib/csv'

const HEADER = 'name,sku,description,category,price,stock,weight_kg'

describe('parseProductsCsv', () => {
  it('parses a clean row and normalizes a $ price to cents', () => {
    const { products } = parseProductsCsv(`${HEADER}\nWireless Mouse,WM-042,Ergo mouse,Electronics,$29.99,75,0.12`)
    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      name: 'Wireless Mouse',
      sku: 'WM-042',
      priceCents: 2999,
      stock: 75,
      weightKg: 0.12,
      category: 'Electronics',
    })
  })

  it('handles quoted commas inside the description', () => {
    const { products } = parseProductsCsv(`${HEADER}\nCoffee,CB-010,"Single origin, medium roast",Food,18.75,500,1.0`)
    expect(products[0].description).toBe('Single origin, medium roast')
    expect(products[0].priceCents).toBe(1875)
  })

  it('skips invalid price (free), negative stock, and missing name with clear reasons', () => {
    const csv = [
      HEADER,
      'Yoga Mat,YM-1,mat,Sports,free,10,0.5',
      'Desk Lamp,DL-1,lamp,Home,20,-5,0.3',
      ',NM-1,x,Misc,10,1,0.1',
    ].join('\n')
    const { products, errors } = parseProductsCsv(csv)
    expect(products).toHaveLength(0)
    expect(errors.map((e) => e.reason)).toEqual([
      expect.stringContaining('Invalid price'),
      expect.stringContaining('Invalid stock'),
      expect.stringContaining('Missing name'),
    ])
  })

  it('defaults blank category to Uncategorized, blank weight to null, blank stock to 0', () => {
    const { products } = parseProductsCsv(`${HEADER}\nThing,TH-1,desc,,10,,`)
    expect(products[0].category).toBe('Uncategorized')
    expect(products[0].weightKg).toBeNull()
    expect(products[0].stock).toBe(0)
  })

  it('dedupes duplicate SKUs keeping the last row and counts duplicatesInFile', () => {
    const csv = `${HEADER}\nA,DUP-1,first,Cat,10,1,0.1\nB,DUP-1,second,Cat,20,2,0.2`
    const { products, duplicatesInFile } = parseProductsCsv(csv)
    expect(products).toHaveLength(1)
    expect(products[0].name).toBe('B')
    expect(products[0].priceCents).toBe(2000)
    expect(duplicatesInFile).toBe(1)
  })
})

describe('hasExpectedHeaders', () => {
  it('is true when all columns are present', () => {
    expect(hasExpectedHeaders(`${HEADER}\n`)).toBe(true)
  })
  it('is false when a column is missing', () => {
    expect(hasExpectedHeaders('name,sku,price\n')).toBe(false)
  })
})
