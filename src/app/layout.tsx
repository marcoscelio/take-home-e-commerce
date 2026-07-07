import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Toaster } from 'sonner'
import { CartButton } from '@/components/cart-button'
import './globals.css'

export const metadata: Metadata = {
  title: 'NTD Store',
  description: 'Enterprise e-commerce take-home',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
          <div className="container flex h-14 items-center gap-4">
            <Link href="/" className="text-lg font-bold tracking-tight text-primary">
              NTD Store
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="rounded-md px-2.5 py-1.5 font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                Shop
              </Link>
              <Link
                href="/admin/products"
                className="rounded-md px-2.5 py-1.5 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Admin
              </Link>
            </nav>
            <div className="ml-auto">
              <CartButton />
            </div>
          </div>
        </header>
        <main className="container py-6">{children}</main>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
