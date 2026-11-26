import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './app/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { CustomerLayout } from './components/layout/CustomerLayout';
import { StaffLayout } from './components/layout/StaffLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { CustomerDashboardPage } from './pages/customer/CustomerDashboardPage';
import { OrdersListPage } from './pages/customer/OrdersListPage';
import { OrderDetailPage } from './pages/customer/OrderDetailPage';
import { TicketsListPage } from './pages/customer/TicketsListPage';
import { CreateTicketPage } from './pages/customer/CreateTicketPage';
import { TicketChatPage } from './pages/customer/TicketChatPage';
import { RefundsHistoryPage } from './pages/customer/RefundsHistoryPage';
import { ProfilePage } from './pages/customer/ProfilePage';
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage';
import { StaffTicketsPage } from './pages/staff/StaffTicketsPage';
import { StaffTicketDetailPage } from './pages/staff/StaffTicketDetailPage';
import { StaffRefundsPage } from './pages/staff/StaffRefundsPage';
import { StaffEscalationsPage } from './pages/staff/StaffEscalationsPage';
import { StaffUsersPage } from './pages/staff/StaffUsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000
    }
  }
});

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-3 rounded-2xl bg-surface px-5 py-3 shadow-card">
        <span className="h-2.5 w-2.5 animate-ping rounded-full bg-accent" />
        <span className="font-mono text-xs font-semibold text-ink-muted">Loading workspace…</span>
      </div>
    </div>
  );
}

function RequireCustomerOrAuth() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireStaff() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'SUPPORT' && user.role !== 'ADMIN') {
    return <Navigate to="/app" replace />;
  }
  return <Outlet />;
}

function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/staff" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<RequireCustomerOrAuth />}>
                <Route path="/app" element={<CustomerLayout />}>
                  <Route index element={<CustomerDashboardPage />} />
                  <Route path="orders" element={<OrdersListPage />} />
                  <Route path="orders/:orderId" element={<OrderDetailPage />} />
                  <Route path="tickets" element={<TicketsListPage />} />
                  <Route path="tickets/new" element={<CreateTicketPage />} />
                  <Route path="tickets/:ticketId" element={<TicketChatPage />} />
                  <Route path="refunds" element={<RefundsHistoryPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route element={<RequireStaff />}>
                <Route path="/staff" element={<StaffLayout />}>
                  <Route index element={<StaffDashboardPage />} />
                  <Route path="tickets" element={<StaffTicketsPage />} />
                  <Route path="tickets/:ticketId" element={<StaffTicketDetailPage />} />
                  <Route path="refunds" element={<StaffRefundsPage />} />
                  <Route path="escalations" element={<StaffEscalationsPage />} />
                  <Route element={<RequireAdmin />}>
                    <Route path="users" element={<StaffUsersPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
