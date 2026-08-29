import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useAuth } from '@workspace/auth-web';
import { useGetSetupStatus } from '@workspace/api-client-react';

import { Shell } from '@/components/layout/Shell';
import NotFound from '@/pages/not-found';
import { Login } from '@/pages/Login';
import { Setup } from '@/pages/Setup';
import { Dashboard } from '@/pages/Dashboard';
import { Inventory } from '@/pages/Inventory';
import { RecordSale } from '@/pages/RecordSale';
import { Customers } from '@/pages/Customers';
import { Reports } from '@/pages/Reports';
import { Mpesa } from '@/pages/Mpesa';
import { AiChat } from '@/pages/AiChat';
import { Settings } from '@/pages/Settings';
import { ActivityLog } from '@/pages/ActivityLog';

const queryClient = new QueryClient();

function FullScreenSpinner() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
    </div>
  );
}

function ProtectedRouter() {
  const { data: setupStatus, isLoading: setupLoading } = useGetSetupStatus();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  if (setupLoading) {
    return <FullScreenSpinner />;
  }

  // First-run: no users exist yet, so route straight to the setup wizard
  // regardless of auth state.
  if (setupStatus?.needsSetup) {
    return <Setup />;
  }

  if (authLoading) {
    return <FullScreenSpinner />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/record-sale" component={RecordSale} />
        <Route path="/customers" component={Customers} />
        <Route path="/reports" component={Reports} />
        <Route path="/mpesa" component={Mpesa} />
        <Route path="/ai-chat" component={AiChat} />
        <Route path="/settings" component={Settings} />
        <Route path="/activity-log" component={ActivityLog} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ProtectedRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
