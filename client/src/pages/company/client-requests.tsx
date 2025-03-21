import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { User, FreightRequestWithQuote } from "@shared/schema";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { Loader2, ArrowLeft, Package, Clock, Map } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDate } from "@/lib/utils";

export default function ClientRequestsPage() {
  const [, params] = useRoute("/company/client/:id/requests");
  const clientId = params?.id ? parseInt(params.id) : null;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("all");

  // Consulta para obter os dados do cliente
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ["/api/users", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${clientId}`);
      if (!res.ok) throw new Error("Falha ao carregar dados do cliente");
      return res.json() as Promise<User>;
    },
    enabled: !!clientId && !!user && user.role === "company",
  });

  // Consulta para obter as solicitações de frete do cliente
  const { data: requests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["/api/client/requests", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/client/${clientId}/requests`);
      if (!res.ok) throw new Error("Falha ao carregar solicitações");
      return res.json() as Promise<FreightRequestWithQuote[]>;
    },
    enabled: !!clientId && !!user && user.role === "company",
  });

  useEffect(() => {
    // Se o usuário não estiver autenticado ou não for uma empresa, redirecionar
    if (user && user.role !== "company") {
      navigate("/");
    }
  }, [user, navigate]);

  // Filtrar solicitações por status
  const filteredRequests = requests?.filter((request) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return request.status === "pending";
    if (activeTab === "active") 
      return ["quoted", "accepted"].includes(request.status);
    if (activeTab === "completed") 
      return ["completed", "rejected"].includes(request.status);
    return true;
  });

  if (isLoadingClient || isLoadingRequests) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Carregando..." />
        <main className="flex-1 container mx-auto p-4 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando informações...</p>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Cliente não encontrado" />
        <main className="flex-1 container mx-auto p-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Cliente não encontrado ou você não tem permissão para acessar esses dados.
                </p>
                <Button onClick={() => navigate("/company/clients")}>
                  Voltar para Lista de Clientes
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Solicitações do Cliente" />
      
      <main className="flex-1 container mx-auto p-4">
        <div className="flex items-center mb-6 gap-2">
          <Button 
            variant="outline" 
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate("/company/clients")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            Solicitações de {client.fullName}
          </h1>
        </div>
        
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Dados do Cliente</p>
                <p className="font-medium">{client.fullName}</p>
                <p className="text-sm">{client.email}</p>
                <p className="text-sm">{client.phone}</p>
              </div>
              {!isMobile && (
                <div className="mt-4 md:mt-0">
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/company/clients`)}
                  >
                    Voltar para Lista de Clientes
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="active">Em Andamento</TabsTrigger>
              <TabsTrigger value="completed">Finalizadas</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value={activeTab} className="mt-0">
            {filteredRequests && filteredRequests.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <p className="font-medium">
                              Solicitação #{request.id}
                            </p>
                          </div>
                          <StatusBadge status={request.status} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4 mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDate(new Date(request.createdAt || ""))}
                            </span>
                          </div>
                          
                          <div className="md:col-span-2 flex items-center gap-1">
                            <Map className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate">
                              {request.originCity} → {request.destinationCity}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4 mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Tipo</p>
                            <p className="font-medium">
                              {request.cargoType === "general" && "Carga Geral"}
                              {request.cargoType === "fragile" && "Frágil"}
                              {request.cargoType === "perishable" && "Perecível"}
                              {request.cargoType === "dangerous" && "Perigosa"}
                              {request.cargoType === "fractional" && "Carga Fracionada"}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Peso</p>
                            <p className="font-medium">{request.weight} kg</p>
                          </div>
                        </div>
                        
                        {request.quote && (
                          <div className="mt-3 p-3 bg-primary/10 rounded-md">
                            <p className="text-sm font-medium mb-1 text-primary">
                              Cotação: R$ {request.quote.value.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Prazo: {request.quote.estimatedDays} dias
                            </p>
                          </div>
                        )}
                        
                        <Separator className="my-3" />
                        
                        <div className="flex justify-end">
                          <Link href={`/company/requests/${request.id}`}>
                            <Button variant="outline" size="sm">
                              Ver Detalhes
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-6">
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      {activeTab === "all"
                        ? "Este cliente ainda não possui solicitações de frete."
                        : "Não há solicitações de frete nesta categoria."}
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab("all")}
                    >
                      Ver Todas as Solicitações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <BottomNavigation />
    </div>
  );
}