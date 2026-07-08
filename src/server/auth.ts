import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'admin_session'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? 'dev-insecure-secret-change-me-in-production')

export function checkCredentials(username: string, password: string): boolean {
  return username === (process.env.ADMIN_USERNAME ?? 'admin') && password === (process.env.ADMIN_PASSWORD ?? 'admin123')
}

export async function createSession(username: string): Promise<void> {
  const token = await new SignJWT({ sub: username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

export async function isAdmin(): Promise<boolean> {
  return (await getSession()) != null
}

export function apiKeyValid(request: Request): boolean {
  const provided = request.headers.get('x-api-key')
  const expected = process.env.API_KEY
  return !!expected && provided === expected
}
