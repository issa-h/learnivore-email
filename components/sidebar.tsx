'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Mail, Zap, Sparkles } from 'lucide-react'
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
    href: '/automations',
    label: 'Automations',
    icon: Zap,
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
    <aside
      aria-label="Navigation principale"
      className="w-56 shrink-0 flex flex-col h-full"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="px-6 py-5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
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
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'font-medium'
                  : ''
              )}
              style={
                isActive
                  ? {
                      background: 'var(--accent-subtle)',
                      color: 'var(--accent-hover)',
                      borderLeft: '3px solid var(--accent)',
                      paddingLeft: 'calc(12px - 3px)',
                    }
                  : {
                      color: 'var(--text-secondary)',
                      borderLeft: '3px solid transparent',
                      paddingLeft: 'calc(12px - 3px)',
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = ''
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div
        className="px-6 py-4"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Learnivore &copy; 2026
        </p>
      </div>
    </aside>
  )
}
