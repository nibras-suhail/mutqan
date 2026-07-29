import { Menu, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/button'
import { cn, getPartnerDisplayName, getPartnerColor } from '../../lib/utils'

interface NavbarProps {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { profile, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <button onClick={onMenuClick} className="lg:hidden p-1 hover:bg-gray-100 rounded">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 mr-auto">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-500" />
            <span className={cn('text-sm font-medium', getPartnerColor(profile?.name || ''))}>{getPartnerDisplayName(profile?.name)}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {profile?.role === 'admin' ? 'مدير' : 'شريك'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">تسجيل خروج</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
