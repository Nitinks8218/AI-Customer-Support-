import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Inbox,
  ShieldAlert,
  RotateCcw,
  Users,
  LogOut,
  Menu,
  X,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { cn } from '../ui/Primitives';

export function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/staff', label: 'Operations Overview', icon: Activity, end: true },
    { to: '/staff/tickets', label: 'Ticket Queue', icon: Inbox },
    { to: '/staff/escalations', label: 'Escalations', icon: ShieldAlert },
    { to: '/staff/refunds', label: 'Refund Reviews', icon: RotateCcw },
    ...(user?.role === 'ADMIN'
      ? [{ to: '/staff/users', label: 'Team & Roles', icon: Users }]
      : [])
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      {/* Desktop Midnight Operations Rail */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-ink-rail p-5 text-white lg:flex">
        <div>
          <Link to="/staff" className="flex items-center gap-3 pb-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent font-display text-base font-bold text-white">
              K
            </span>
            <div>
              <p className="font-display text-base font-bold tracking-tight">Kestrel Ops</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                Staff Console
              </p>
            </div>
          </Link>

          <nav className="space-y-1" aria-label="Staff Operations Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
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

        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="rounded-xl bg-white/5 px-3 py-2.5">
            <p className="text-xs font-semibold text-white">{user?.name}</p>
            <p className="font-mono text-[11px] text-slate-400">{user?.role}</p>
          </div>
          <Link
            to="/app"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Customer View
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/15"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-ink-rail px-4 text-white lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Toggle staff menu"
              onClick={() => setMobileOpen((p) => !p)}
              className="rounded-lg p-1.5 hover:bg-white/10"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="font-display text-sm font-bold">Kestrel Ops</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
          >
            Sign out
          </button>
        </header>

        {mobileOpen && (
          <div className="border-b border-white/10 bg-ink-rail px-4 py-3 text-white lg:hidden">
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
                        'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium',
                        isActive ? 'bg-accent text-white' : 'text-slate-300 hover:bg-white/10'
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

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
