import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ClientHomePage from "@/pages/client/home-page";
import CompanyHomePage from "@/pages/company/home-page";
import NewRequestPage from "@/pages/client/new-request";
import RequestDetailsPage from "@/pages/client/request-details";
import RequestsPage from "@/pages/client/requests-page";
import ReportsPage from "@/pages/client/reports-page";
import EditRequestPage from "@/pages/client/edit-request";
import CompanyRequestDetailsPage from "@/pages/company/request-details";
import CreateQuotePage from "@/pages/company/create-quote";
import ClientsPage from "@/pages/company/clients";
import CreateClientPage from "@/pages/company/create-client";
import ClientRequestsPage from "@/pages/company/client-requests";

export function Router() {
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
        path="/requests/:id/edit" 
        component={EditRequestPage} 
        allowedRoles={["client"]} 
      />
      <ProtectedRoute 
        path="/reports" 
        component={ReportsPage} 
        allowedRoles={["client"]} 
      />
      
      {/* Company routes */}
      <ProtectedRoute 
        path="/company/requests/:id" 
        component={CompanyRequestDetailsPage} 
        allowedRoles={["company"]} 
      />
      <ProtectedRoute 
        path="/company/requests/:id/quote" 
        component={CreateQuotePage} 
        allowedRoles={["company"]} 
      />
      <ProtectedRoute 
        path="/company/clients" 
        component={ClientsPage} 
        allowedRoles={["company"]} 
      />
      <ProtectedRoute 
        path="/company/clients/new" 
        component={CreateClientPage} 
        allowedRoles={["company"]} 
      />
      <ProtectedRoute 
        path="/company/clients/:id/requests" 
        component={ClientRequestsPage} 
        allowedRoles={["company"]} 
      />
      
      <Route component={NotFound} />
    </Switch>
  );
} 