import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Truck, ArrowDown, Package, CheckCircle, Clock, Plus, ArrowRight, FileText } from "lucide-react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { FreightRequestWithQuote } from "@shared/schema";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { formatISODateToDisplay } from "@/lib/utils";

export default function ClientHomePage() {
  const [, navigate] = useLocation();
  
  const { data: pendingRequests, isLoading: isPendingLoading } = useQuery<FreightRequestWithQuote[]>({
    queryKey: ["/api/pending-requests"],
  });
  
  const { data: activeRequests, isLoading: isActiveLoading } = useQuery<FreightRequestWithQuote[]>({
    queryKey: ["/api/active-requests"],
  });
  
  const { data: completedRequests, isLoading: isCompletedLoading } = useQuery<FreightRequestWithQuote[]>({
    queryKey: ["/api/completed-requests"],
  });
  
  // Combinando todos os fretes para a lista geral
  const requests = [
    ...(pendingRequests || []),
    ...(activeRequests || []),
    ...(completedRequests || []),
  ];
  
  // Verificar se todos os dados estão carregando
  const isLoading = isPendingLoading || isActiveLoading || isCompletedLoading;

  // Calculate statistics
  const stats = {
    totalRequests: requests.length,
    pendingRequests: pendingRequests?.filter(req => req.status === "pending").length || 0,
    quotedRequests: pendingRequests?.filter(req => req.status === "quoted").length || 0,
    activeRequests: activeRequests?.length || 0,
    completedRequests: completedRequests?.length || 0,
  };
  
  // Colunas para desktop
  const requestColumns: ColumnDef<FreightRequestWithQuote>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <span className="font-medium">#{row.getValue("id")}</span>,
    },
    {
      accessorKey: "route",
      header: "Origem/Destino",
      cell: ({ row }) => {
        const request = row.original;
        return (
          <div>
            <div>{request.originCity}</div>
            <div className="text-xs text-neutral-500 flex items-center">
              <ArrowDown className="h-3 w-3 mr-1" />
              <span>{request.destinationCity}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "pickupDate",
      header: "Data",
      cell: ({ row }) => formatISODateToDisplay(row.original.pickupDate),
    },
    {
      accessorKey: "cargo",
      header: "Carga",
      cell: ({ row }) => (
        <span className="truncate max-w-[150px] block">
          {row.original.cargoType === "general" && "Carga Geral"}
          {row.original.cargoType === "fragile" && "Frágil"}
          {row.original.cargoType === "perishable" && "Perecível"}
          {row.original.cargoType === "dangerous" && "Perigosa"}
          {row.original.cargoType === "fractional" && "Fracionada"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        return (
          <div className="text-right">
            <Button
              variant="link"
              className="h-8 px-2 text-primary"
              onClick={() => navigate(`/requests/${row.original.id}`)}
            >
              Detalhes
            </Button>
          </div>
        );
      },
    },
  ];
  
  // Colunas para mobile - mais simplificado
  const mobileRequestColumns: ColumnDef<FreightRequestWithQuote>[] = [
    {
      accessorKey: "route",
      header: "Rota",
      cell: ({ row }) => {
        const request = row.original;
        return (
          <div>
            <div className="font-medium">{request.originCity}</div>
            <div className="text-xs text-neutral-500 flex items-center">
              <ArrowDown className="h-3 w-3 mr-1" />
              <span>{request.destinationCity}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate(`/requests/${row.original.id}`)}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-700">Painel do Cliente</h2>
          <Button 
            onClick={() => navigate("/requests/new")}
            className="bg-[#FF8F00] hover:bg-[#F57C00] text-white shadow-md"
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova Solicitação
          </Button>
        </div>
        
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-neutral-700">Solicitações</h3>
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary">{stats.totalRequests}</p>
                  <p className="text-sm text-neutral-500">Total de solicitações</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-neutral-700">Pendentes</h3>
                    <Clock className="h-5 w-5 text-[#FF9800]" />
                  </div>
                  <p className="text-3xl font-bold text-[#FF9800]">{stats.pendingRequests + stats.quotedRequests}</p>
                  <p className="text-sm text-neutral-500">Aguardando processo</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-neutral-700">Concluídas</h3>
                    <CheckCircle className="h-5 w-5 text-[#4CAF50]" />
                  </div>
                  <p className="text-3xl font-bold text-[#4CAF50]">{stats.completedRequests}</p>
                  <p className="text-sm text-neutral-500">Transportes finalizados</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        
        {/* Solicitações Pendentes */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-neutral-700">Solicitações Pendentes</CardTitle>
          </CardHeader>
          
          <>
            {/* Desktop Table */}
            <CardContent className="p-0 hidden md:block">
              <DataTable 
                columns={requestColumns}
                data={pendingRequests || []}
                isLoading={isPendingLoading}
              />
            </CardContent>

            {/* Mobile Table */}
            <CardContent className="p-0 md:hidden">
              <DataTable 
                columns={mobileRequestColumns}
                data={pendingRequests || []}
                isLoading={isPendingLoading}
              />
            </CardContent>
            
            {!isPendingLoading && pendingRequests?.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                Não há solicitações pendentes.
              </div>
            )}
          </>
        </Card>
        
        {/* Solicitações Concluídas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-neutral-700">Solicitações Concluídas</CardTitle>
          </CardHeader>
          
          <>
            {/* Desktop Table */}
            <CardContent className="p-0 hidden md:block">
              <DataTable 
                columns={requestColumns}
                data={completedRequests || []}
                isLoading={isCompletedLoading}
              />
            </CardContent>

            {/* Mobile Table */}
            <CardContent className="p-0 md:hidden">
              <DataTable 
                columns={mobileRequestColumns}
                data={completedRequests || []}
                isLoading={isCompletedLoading}
              />
            </CardContent>
            
            {!isCompletedLoading && completedRequests?.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                Não há solicitações concluídas.
              </div>
            )}
            
            {!isLoading && (
              <div className="p-4 border-t border-neutral-200 flex justify-between">
                <Button
                  variant="link"
                  className="text-primary p-0 h-auto font-medium text-sm"
                  onClick={() => navigate("/requests")}
                >
                  Ver todas as solicitações
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                
                <Button
                  variant="link"
                  className="text-primary p-0 h-auto font-medium text-sm"
                  onClick={() => navigate("/reports")}
                >
                  Acessar relatórios
                  <FileText className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        </Card>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
