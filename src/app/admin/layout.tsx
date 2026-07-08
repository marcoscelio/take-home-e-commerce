import { LogOut } from 'lucide-react'
import { getSession } from '@/server/auth'
import { logoutAction } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <div className="space-y-4">
      {session && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{session}</span>
          </span>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </div>
      )}
      {children}
    </div>
  )
}
