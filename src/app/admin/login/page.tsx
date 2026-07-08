import { LoginForm } from './login-form'

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams
  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Admin sign in</h1>
      <p className="mb-6 text-sm text-muted-foreground">Restricted area — product management.</p>
      <LoginForm from={from ?? '/admin/products'} />
    </div>
  )
}
