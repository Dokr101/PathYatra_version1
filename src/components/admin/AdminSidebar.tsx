import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BedDouble,
  FolderTree,
  Images,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MapPin,
  MessageSquareText,
  Mountain,
  Route,
  Settings,
  UsersRound,
} from 'lucide-react'
import logoMark from '../../assets/logo-mark.png'
import { useApp } from '../../context/AppContext'
import { cx } from '../../lib/adminFormat'

export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/destinations', label: 'Destinations', icon: MapPin },
  { to: '/admin/media', label: 'Image Library', icon: Images },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/activities', label: 'Activities & Attractions', icon: Mountain },
  { to: '/admin/places', label: 'Hotels & Restaurants', icon: BedDouble },
  { to: '/admin/itineraries', label: 'Itinerary Templates', icon: Route },
  { to: '/admin/travel-info', label: 'Travel Information', icon: Info },
  { to: '/admin/reviews', label: 'Reviews & Feedback', icon: MessageSquareText },
  { to: '/admin/users', label: 'Users', icon: UsersRound },
  { to: '/admin/analytics', label: 'Reports & Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Admin Settings', icon: Settings },
] as const

export function AdminSidebar({
  open,
  collapsed,
  onClose,
  onToggle,
  onHoverChange,
}: {
  open: boolean
  collapsed: boolean
  onClose: () => void
  onToggle: () => void
  onHoverChange: (hovered: boolean) => void
}) {
  const { user, signOut } = useApp()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const compact = collapsed && !hovered
  const toggleLabel = open ? 'Close navigation' : collapsed ? 'Expand navigation' : 'Collapse navigation'

  const toggleSidebar = () => {
    setHovered(false)
    onHoverChange(false)
    onToggle()
  }

  const logout = () => {
    signOut()
    onClose()
    navigate('/')
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cx(
          'fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        onMouseEnter={() => {
          setHovered(true)
          onHoverChange(true)
        }}
        onMouseLeave={() => {
          setHovered(false)
          onHoverChange(false)
        }}
        className={cx(
          'motion-sidebar sidebar-panel fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#d9cdb6] bg-[#f4ecdb]',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed && (hovered ? 'lg:w-72' : 'lg:w-16'),
        )}
        data-compact={compact}
        aria-label="Admin navigation"
      >
        <div
          className={cx(
            'border-b border-[#d9cdb6] px-5 py-4',
            compact && 'lg:px-2',
          )}
        >
          <NavLink
            to="/admin"
            className={cx('flex items-center gap-2.5', compact && 'lg:justify-center lg:gap-0')}
            onClick={onClose}
          >
            <img src={logoMark} alt="" className="h-9 w-9 shrink-0 object-contain" />
            <span className="sidebar-label">
              <span className="block font-display text-lg leading-none text-ink">PathYatra</span>
              <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                Admin panel
              </span>
            </span>
          </NavLink>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={toggleLabel}
            className={cx(
              'mt-4 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] text-ink-soft transition-colors hover:bg-[#ebdfc9] hover:text-ink',
              compact && 'lg:justify-center lg:gap-0 lg:px-0',
            )}
            title={compact ? toggleLabel : undefined}
          >
            <Menu size={18} className="shrink-0" />
            <span className="sidebar-label">{toggleLabel}</span>
          </button>
        </div>

        <nav className={cx('no-scrollbar flex-1 overflow-y-auto px-3 py-3', compact && 'lg:px-1.5')}>
          <p className={cx('px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute/80', compact && 'lg:hidden')}>
            Manage
          </p>
          <ul className="space-y-0.5">
            {ADMIN_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] transition-colors',
                      compact && 'lg:justify-center lg:gap-0 lg:px-0',
                      isActive
                        ? 'bg-pine text-paper shadow-sm'
                        : 'text-ink-soft hover:bg-[#ebdfc9] hover:text-ink',
                    )
                  }
                  title={compact ? item.label : undefined}
                >
                  <item.icon size={16} strokeWidth={1.8} className="shrink-0" />
                  <span className="sidebar-label leading-tight">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[#d9cdb6] p-3">
          <div className={cx('mb-2 rounded-xl bg-[#fbf5e8] px-3 py-2.5', compact && 'lg:hidden')}>
            <p className="truncate text-xs font-medium text-ink">{user?.name ?? 'Admin'}</p>
            <p className="truncate text-[11px] text-ink-mute">{user?.email}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-pine-3">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className={cx(
              'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] text-ink-soft transition-colors hover:bg-[#ebdfc9] hover:text-ink',
              compact && 'lg:justify-center lg:gap-0 lg:px-0',
            )}
            title={compact ? 'Logout' : undefined}
          >
            <LogOut size={16} strokeWidth={1.8} />
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
