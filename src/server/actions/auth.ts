'use server'

import { redirect } from 'next/navigation'
import { checkCredentials, createSession, destroySession } from '@/server/auth'

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const from = String(formData.get('from') ?? '/admin/products')

  if (!checkCredentials(username, password)) return { error: 'Invalid username or password' }
  await createSession(username)
  redirect(from.startsWith('/admin') ? from : '/admin/products')
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect('/admin/login')
}
