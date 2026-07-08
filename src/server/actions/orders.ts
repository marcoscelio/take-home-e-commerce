'use server'

import { revalidatePath } from 'next/cache'
import { checkout, type CheckoutResult } from '@/server/services/orders'

export type CheckoutLine = { productId: string; quantity: number }

export async function checkoutAction(lines: CheckoutLine[], outcome: 'approve' | 'decline' = 'approve'): Promise<CheckoutResult> {
  const res = await checkout({ lines, outcome })
  if (res.ok) {
    revalidatePath('/')
    revalidatePath('/admin/products')
  }
  return res
}
