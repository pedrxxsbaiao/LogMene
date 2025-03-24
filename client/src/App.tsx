import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import React, { useEffect } from "react";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import ClientHomePage from "@/pages/client/home-page";
import CompanyHomePage from "@/pages/company/home-page";
import NewRequestPage from "@/pages/client/new-request";
import RequestDetailsPage from "@/pages/client/request-details";
import RequestsPage from "@/pages/client/requests-page";
import ReportsPage from "@/pages/client/reports-page";
import CompanyRequestDetailsPage from "@/pages/company/request-details";
import CreateQuotePage from "@/pages/company/create-quote";
import ClientsPage from "@/pages/company/clients";
import CreateClientPage from "@/pages/company/create-client";
import ClientRequestsPage from "@/pages/company/client-requests";
import TestNotificationPage from "@/pages/test-notification";
import TestGmailPage from "@/pages/test-gmail";
import TestDistancePage from "@/pages/test-distance";
import TestSMSPage from "@/pages/test-sms";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Client routes */}
      <ProtectedRoute 
        path="/" 
        component={() => (
          user?.role === "client" ? <ClientHomePage /> : <CompanyHomePage />
        )} 
      />
      <ProtectedRoute 
        path="/requests/new" 
        component={NewRequestPage} 
        allowedRoles={["client"]} 
      />
      <ProtectedRoute 
        path="/requests" 
        component={RequestsPage} 
        allowedRoles={["client"]} 
      />
      <ProtectedRoute 
        path="/requests/:id" 
        component={RequestDetailsPage} 
        allowedRoles={["client"]} 
      />
      <ProtectedRoute 
        path="/reports" 
        component={ReportsPage} 
        allowedRoles={["client"]} 
      />
      
      {/* Company routes */}
      <ProtectedRoute 
        path="/company/quotes/:requestId" 
        component={CreateQuotePage} 
        allowedRoles={["company"]} 
      />
      <ProtectedRoute 
        path="/company/clients" 
        component={ClientsPage} 
        allowedRoles={["company"]} 
      />
      <ProtectedRoute 
        path="/company/create-client" 
        component={CreateClientPage} 
        allowedRoles={["company"]} 
      />
      <ProtectedRoute 
        path="/company/requests/:id" 
        component={CompanyRequestDetailsPage} 
        allowedRoles={["company"]} 
      />
      <ProtectedRoute 
        path="/company/client/:id/requests" 
        component={ClientRequestsPage} 
        allowedRoles={["company"]} 
      />
      
      {/* Test tools route - for development only */}
      <ProtectedRoute 
        path="/test-notification" 
        component={TestNotificationPage} 
      />
      
      <ProtectedRoute 
        path="/test-gmail" 
        component={TestGmailPage} 
      />
      
      <ProtectedRoute 
        path="/test-distance" 
        component={TestDistancePage} 
      />
      
      <ProtectedRoute 
        path="/test-sms" 
        component={TestSMSPage} 
      />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Forçar o tema escuro diretamente na raiz do aplicativo
  useEffect(() => {
    // Adicionar classe dark ao HTML
    document.documentElement.classList.add('dark');
    // Definir o fundo escuro diretamente
    document.body.style.backgroundColor = '#0f172a'; // bg-slate-900
    document.documentElement.style.backgroundColor = '#0f172a'; // bg-slate-900
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="bg-slate-900 min-h-screen text-slate-50">
          <Router />
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
