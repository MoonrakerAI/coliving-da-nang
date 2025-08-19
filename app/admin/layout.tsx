import Link from 'next/link'
import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { LayoutDashboard, CreditCard, Wallet, Users, Home, Building2 } from 'lucide-react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  // use client only for pathname
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''

  const nav = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/payments', label: 'Payments', icon: CreditCard },
    { href: '/admin/expenses', label: 'Expenses', icon: Wallet },
    { href: '/admin/tenants', label: 'Tenants', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:flex w-64 flex-col border-r bg-white">
        <div className="h-16 flex items-center gap-2 px-6 border-b">
          <Building2 className="h-5 w-5 text-indigo-600" />
          <span className="font-semibold">Coliving Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100',
                  active ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t">
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <Home className="h-4 w-4" />
            Public Site
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
