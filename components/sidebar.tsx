'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Mail, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
  },
  {
    href: '/contacts',
    label: 'Contacts',
    icon: Users,
  },
  {
    href: '/sequences',
    label: 'Séquences',
    icon: Mail,
  },
  {
    href: '/ai',
    label: 'IA',
    icon: Sparkles,
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside aria-label="Navigation principale" className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900 tracking-tight">
          Learnivore Email
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              )}
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">Learnivore &copy; 2026</p>
      </div>
    </aside>
  )
}
