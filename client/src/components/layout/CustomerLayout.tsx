import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  MessageSquareText,
  RotateCcw,
  UserCircle,
  PlusCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { cn, Button } from '../ui/Primitives';

const navItems = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/orders', label: 'Orders', icon: Package },
  { to: '/app/tickets', label: 'Support Tickets', icon: MessageSquareText },
  { to: '/app/refunds', label: 'Simulated Refunds', icon: RotateCcw },
  { to: '/app/profile', label: 'Profile & AI Mode', icon: UserCircle }
];

export function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isStaff = user?.role === 'SUPPORT' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top Editorial Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="rounded-lg p-2 text-ink-muted hover:bg-subtle lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/app" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-rail font-display text-sm font-bold text-white">
                K
              </span>
              <div className="leading-tight">
                <span className="font-display text-base font-bold tracking-tight text-ink">
                  Kestrel Care
                </span>
                <span className="hidden text-[11px] font-medium text-ink-muted sm:block">
                  Customer Support Portal
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Customer Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-ink-rail text-white'
                        : 'text-ink-muted hover:bg-subtle hover:text-ink'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {isStaff && (
              <Link to="/staff">
                <Button variant="outline" size="sm">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Staff Console</span>
                </Button>
              </Link>
            )}
            <Link to="/app/tickets/new">
              <Button variant="primary" size="sm">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">New Ticket</span>
              </Button>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-xl border border-border p-2 text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="border-t border-border bg-surface px-4 py-3 lg:hidden">
            <div className="mb-3 flex items-center justify-between rounded-xl bg-subtle px-3 py-2 text-xs">
              <span className="font-semibold text-ink">{user?.name}</span>
              <span className="font-mono text-ink-muted">{user?.email}</span>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium',
                        isActive ? 'bg-ink-rail text-white' : 'text-ink-muted hover:bg-subtle'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-border bg-surface/60 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 text-xs text-ink-muted sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-ops" />
            <span>Demo Environment — All orders and refunds are simulated. No real funds are moved.</span>
          </div>
          <span className="font-mono">14-day return window · ₹5,000 auto-limit</span>
        </div>
      </footer>
    </div>
  );
}
