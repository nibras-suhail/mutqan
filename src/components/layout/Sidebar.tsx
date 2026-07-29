import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Wallet, ArrowLeftRight,
  FileBarChart, X, Package
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useNotifications } from '../../context/NotificationContext'

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/orders', label: 'الطلبات', icon: ClipboardList },
  { to: '/inventory', label: 'المخزون', icon: Package },
  { to: '/payments', label: 'السداد', icon: Wallet },
  { to: '/transfers', label: 'التحويلات', icon: ArrowLeftRight },
  { to: '/reports/daily', label: 'تقرير يومي', icon: FileBarChart },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { unread, markRead } = useNotifications()

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        'fixed top-0 right-0 z-50 h-full w-64 bg-white border-l border-gray-200 transform transition-transform duration-200 lg:relative lg:translate-x-0',
        open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold text-primary">متقن</h1>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => { onClose(); if (item.to === '/') markRead() }}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {item.to === '/' && unread && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger rounded-full" />
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
