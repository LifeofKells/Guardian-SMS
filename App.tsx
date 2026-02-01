
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Officers from './pages/Officers';
import Timesheets from './pages/Timesheets';
import Clients from './pages/Clients';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Accounting from './pages/Accounting';
import Feedback from './pages/Feedback';
import AuditLogs from './pages/AuditLogs';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from './components/ui';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShieldCheck, Loader2 } from 'lucide-react';

// Initialize Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, mustChangePassword, changePassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'schedule': return <Schedule />;
      case 'officers': return <Officers />;
      case 'timesheets': return <Timesheets />;
      case 'clients': return <Clients />;
      case 'accounting': return <Accounting />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      case 'feedback': return <Feedback />;
      case 'audit': return <AuditLogs />;
      default:
        return (
          <div className="flex items-center justify-center h-[50vh]">
            <Card className="w-[400px]">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>Module <strong>{currentPage}</strong> is under construction.</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <Layout currentPage={currentPage} setPage={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="guardian-theme">
        <ToastProvider>
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
