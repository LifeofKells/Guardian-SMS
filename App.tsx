import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import CommandCenterWorkspace from './pages/CommandCenterWorkspace';
import Schedule from './pages/Schedule';
import CalendarView from './pages/CalendarView';
import Officers from './pages/Officers';
import Timesheets from './pages/Timesheets';
import Clients from './pages/Clients';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Accounting from './pages/Accounting';
import Feedback from './pages/Feedback';
import AuditLogs from './pages/AuditLogs';
import Resources from './pages/Resources';
import Messaging from './pages/Messaging';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from './components/ui';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { BreadcrumbProvider } from './contexts/BreadcrumbContext';
import { useBreadcrumbs } from './contexts/BreadcrumbContext';
import { NotificationProvider } from './components/NotificationCenter';
import { AnimatedPage } from './components/PageTransition';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { ClientPortalAuthProvider, useClientPortalAuth } from './contexts/ClientPortalAuthContext';
import { ClientPortalLogin } from './pages/portal/ClientPortalLogin';
import { ClientDashboard } from './pages/portal/ClientDashboard';
import { ServiceRequests } from './pages/portal/ServiceRequests';
import { ClientReportsHub } from './pages/portal/ClientReportsHub';
import { SiteInstructions } from './pages/portal/SiteInstructions';
import { ClientProfile } from './pages/portal/ClientProfile';
import { ClientPortalLayout } from './components/ClientPortalLayout';
import { useAutoShiftCompletion } from './hooks/useAutoShiftCompletion';

// Initialize Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function AuthenticatedAppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, mustChangePassword, changePassword, logout } = useAuth();
  const { pushBreadcrumb, replaceLastBreadcrumb, setTopLevelBreadcrumb } = useBreadcrumbs();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Background Tasks
  useAutoShiftCompletion();

  if (!user) {
    return <Login />;
  }

  // Force Password Change Screen
  if (mustChangePassword) {
    const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
      }
      setLoading(true);
      try {
        await changePassword(newPassword);
      } catch (e: any) {
        alert("Error: " + e.message);
      }
      setLoading(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-amber-100 p-3 rounded-full w-fit mb-3">
              <ShieldCheck className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle>Security Update Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-slate-500 mb-6">
              For your security, you must update your temporary password before accessing the system.
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Password
              </Button>
              <div className="text-center pt-2">
                <button type="button" onClick={logout} className="text-xs text-muted-foreground hover:underline">Cancel & Sign Out</button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Derive current page key from path
  const path = location.pathname.replace(/^\//, '');
  const currentPage = path === '' ? 'dashboard' : path;

  const handlePageChange = (page: string, data?: Record<string, any>) => {
    const pageLabels: Record<string, string> = {
      dashboard: 'Workspace',
      schedule: 'Schedule',
      calendar: 'Calendar',
      officers: 'Officers',
      timesheets: 'Timesheets',
      clients: 'Clients & Sites',
      accounting: 'Accounting',
      resources: 'Resources',
      messaging: 'Messaging',
      reports: 'Reports',
      settings: 'Settings',
      feedback: 'Feedback',
      audit: 'Audit Logs'
    };

    const label = data?.label || pageLabels[page] || page;
    const isTopLevel = page in pageLabels;
    const crumb = { id: `${page}-${Date.now()}`, label, page, data };

    if (isTopLevel && !data?.drillDown) {
      setTopLevelBreadcrumb(crumb);
    } else if (currentPage === page && data) {
      replaceLastBreadcrumb(crumb);
    } else {
      pushBreadcrumb(crumb);
    }

    const targetUrl = page === 'dashboard' ? '/' : `/${page}`;
    navigate(targetUrl);
  };

  return (
    <Layout currentPage={currentPage} setPage={handlePageChange}>
      <AnimatedPage key={location.pathname} animation="fade-in-up">
        <Routes>
          <Route path="/" element={<CommandCenterWorkspace onNavigate={handlePageChange} />} />
          <Route path="/dashboard" element={<CommandCenterWorkspace onNavigate={handlePageChange} />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/officers" element={<Officers />} />
          <Route path="/timesheets" element={<Timesheets />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/messaging" element={<Messaging />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatedPage>
    </Layout>
  );
}

function AuthenticatedApp() {
  return (
    <NotificationProvider>
      <BreadcrumbProvider>
        <AuthenticatedAppContent />
      </BreadcrumbProvider>
    </NotificationProvider>
  );
}

function PortalApp() {
  const { user, isLoading } = useClientPortalAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <ClientPortalLogin />;
  }

  const subPath = location.pathname.replace(/^\/portal\/?/, '');
  const currentPage = subPath === '' ? 'dashboard' : subPath;

  const handleNavigate = (page: string) => {
    const newPath = page === 'dashboard' ? '/portal' : `/portal/${page}`;
    navigate(newPath);
  };

  return (
    <ClientPortalLayout currentPage={currentPage} onNavigate={handleNavigate}>
      <AnimatedPage key={location.pathname} animation="fade-in-up">
        <Routes>
          <Route path="/" element={<ClientDashboard />} />
          <Route path="/dashboard" element={<ClientDashboard />} />
          <Route path="/requests" element={<ServiceRequests />} />
          <Route path="/reports" element={<ClientReportsHub />} />
          <Route path="/instructions" element={<SiteInstructions />} />
          <Route path="/profile" element={<ClientProfile />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </AnimatedPage>
    </ClientPortalLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="guardian-theme">
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/portal/*"
                element={
                  <ClientPortalAuthProvider>
                    <PortalApp />
                  </ClientPortalAuthProvider>
                }
              />
              <Route
                path="/*"
                element={
                  <AuthProvider>
                    <AuthenticatedApp />
                  </AuthProvider>
                }
              />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
