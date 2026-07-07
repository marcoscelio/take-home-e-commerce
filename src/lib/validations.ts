import { z } from 'zod'

const optionalWeight = z.preprocess(
  (v) => (v === '' || v == null ? undefined : typeof v === 'string' ? Number(v) : v),
  z.number().min(0, 'Weight must be ≥ 0').optional(),
)

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  sku: z.string().trim().min(1, 'SKU is required').max(64),
  description: z.string().trim().max(2000).default(''),
  category: z.string().trim().max(100).default(''),
  price: z.coerce.number({ invalid_type_error: 'Price is required' }).min(0, 'Price must be ≥ 0'),
  stock: z.coerce
    .number({ invalid_type_error: 'Stock is required' })
    .int('Stock must be a whole number')
    .min(0, 'Stock must be ≥ 0'),
  weightKg: optionalWeight,
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export const CATEGORY_FALLBACK = 'Uncategorized'
