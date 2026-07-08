import { describe, it, expect } from 'vitest'
import { productFormSchema } from '@/lib/validations'

describe('productFormSchema', () => {
  it('accepts a valid product and coerces string numbers', () => {
    const r = productFormSchema.safeParse({
      name: 'X',
      sku: 'S1',
      description: 'd',
      category: 'c',
      price: '9.99',
      stock: '5',
      weightKg: '0.5',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.price).toBe(9.99)
      expect(r.data.stock).toBe(5)
      expect(r.data.weightKg).toBe(0.5)
    }
  })

  it('rejects empty name or sku', () => {
    expect(productFormSchema.safeParse({ name: '', sku: '', price: 1, stock: 1 }).success).toBe(false)
  })

  it('rejects negative price and non-integer stock', () => {
    expect(productFormSchema.safeParse({ name: 'X', sku: 'S', price: -1, stock: 1 }).success).toBe(false)
    expect(productFormSchema.safeParse({ name: 'X', sku: 'S', price: 1, stock: 1.5 }).success).toBe(false)
  })

  it('treats empty weight as undefined (optional)', () => {
    const r = productFormSchema.safeParse({ name: 'X', sku: 'S', price: 1, stock: 1, weightKg: '' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.weightKg).toBeUndefined()
  })
})
