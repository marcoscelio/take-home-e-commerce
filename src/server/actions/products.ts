'use server'

import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/server/auth'
import * as products from '@/server/services/products'
import type { ProductFormValues } from '@/lib/validations'

function revalidate() {
  revalidatePath('/admin/products')
  revalidatePath('/')
}

export async function createProductAction(values: ProductFormValues) {
  if (!(await isAdmin())) return { ok: false as const, error: 'Unauthorized', status: 401 }
  const res = await products.createProduct(values)
  if (res.ok) revalidate()
  return res
}

export async function updateProductAction(id: string, values: ProductFormValues) {
  if (!(await isAdmin())) return { ok: false as const, error: 'Unauthorized', status: 401 }
  const res = await products.updateProduct(id, values)
  if (res.ok) revalidate()
  return res
}

export async function deleteProductAction(id: string) {
  if (!(await isAdmin())) return { ok: false as const, error: 'Unauthorized', status: 401 }
  const res = await products.deleteProduct(id)
  if (res.ok) revalidate()
  return res
}
