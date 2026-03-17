import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Inbox from "@/pages/Inbox";
import PriorityInbox from "@/pages/PriorityInbox";
import Home from "@/pages/Home";
import SettingsPage from "@/pages/SettingsPage";
import TemplatesPage from "@/pages/TemplatesPage";
import NotFound from "./pages/NotFound";
import DesignTest from "./pages/DesignTest";
import AdminPanel from "./pages/AdminPanel";
import CatalogPage from "./pages/CatalogPage";
import KnowledgePage from "./pages/KnowledgePage";
import OnboardingWizard from "@/components/OnboardingWizard";
import { Loader2 } from "lucide-react";
import { SUPER_ADMIN_EMAIL } from "@/lib/constants";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, companyId, userRole } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      const done = localStorage.getItem('onboarding_complete');
      const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
      // Show onboarding only for new admin users in a company, never for super admin
      if (!done && !isSuperAdmin && companyId && userRole === 'admin') {
        setShowOnboarding(true);
      }
      setChecked(true);
    } else if (!isLoading) {
      setChecked(true);
    }
  }, [isLoading, user, companyId, userRole]);

  if (isLoading || !checked) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const SmartHome = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!user) return <Landing />;
  return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/signup" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/" element={<SmartHome />} />
    <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<ErrorBoundary fallbackTitle="Error en Dashboard"><Home /></ErrorBoundary>} />
      <Route path="/inbox" element={<ErrorBoundary fallbackTitle="Error en Inbox"><Inbox /></ErrorBoundary>} />
      <Route path="/priority" element={<ErrorBoundary fallbackTitle="Error en Priority"><PriorityInbox /></ErrorBoundary>} />
      <Route path="/settings" element={<ErrorBoundary fallbackTitle="Error en Settings"><SettingsPage /></ErrorBoundary>} />
      <Route path="/templates" element={<ErrorBoundary fallbackTitle="Error en Templates"><TemplatesPage /></ErrorBoundary>} />
      <Route path="/catalog" element={<ErrorBoundary fallbackTitle="Error en Catálogo"><CatalogPage /></ErrorBoundary>} />
      <Route path="/knowledge" element={<ErrorBoundary fallbackTitle="Error en Conocimiento"><KnowledgePage /></ErrorBoundary>} />
      <Route path="/admin" element={<ErrorBoundary fallbackTitle="Error en Admin"><AdminPanel /></ErrorBoundary>} />
    </Route>
    <Route path="/design-test" element={<DesignTest />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ErrorBoundary showHomeButton={false}>
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
