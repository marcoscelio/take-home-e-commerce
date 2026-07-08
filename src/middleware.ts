import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? 'dev-insecure-secret-change-me-in-production')

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return false
  try {
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const authed = await isAuthed(req)

  if (pathname === '/admin/login') {
    if (authed) return NextResponse.redirect(new URL('/admin/products', req.url))
    return NextResponse.next()
  }

  if (!authed) {
    const url = new URL('/admin/login', req.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
