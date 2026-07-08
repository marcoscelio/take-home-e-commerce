'use server'

import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/server/auth'
import { importProducts, type ImportSummary } from '@/server/services/import'

export async function importCsvAction(text: string): Promise<ImportSummary> {
  if (!(await isAdmin()))
    return { ok: false, error: 'Unauthorized', created: 0, updated: 0, skipped: 0, duplicatesInFile: 0, errors: [] }

  const res = await importProducts(text)
  if (res.ok) {
    revalidatePath('/admin/products')
    revalidatePath('/')
  }
  return res
}
