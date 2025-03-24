import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Truck, ArrowDown, Package, CheckCircle, Clock, Plus, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { FreightRequestWithQuote } from "@shared/schema";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

export default function RequestsPage() {
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
  
  // Colunas para desktop
  const requestColumns: ColumnDef<FreightRequestWithQuote>[] = [
    {
      accessorKey: "clientOrderNumber",
      header: "Seu Pedido",
      cell: ({ row }) => {
        const value = row.original.clientOrderNumber;
        return <span className="font-medium">#{value || row.original.id}</span>;
      },
    },
    {
      accessorKey: "id",
      header: "ID Sistema",
      cell: ({ row }) => <span className="text-muted-foreground">#{row.getValue("id")}</span>,
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
      cell: ({ row }) => row.original.pickupDate,
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
      accessorKey: "clientOrderNumber",
      header: "Pedido",
      cell: ({ row }) => {
        const value = row.original.clientOrderNumber;
        return <span className="font-medium">#{value || row.original.id}</span>;
      },
    },
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
      <Header title="Minhas Solicitações" />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-700">Minhas Solicitações</h2>
          <Button 
            onClick={() => navigate("/requests/new")}
            className="bg-[#FF8F00] hover:bg-[#F57C00] text-white shadow-md"
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova Solicitação
          </Button>
        </div>
        
        {/* Requests Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-neutral-700">Todas as Solicitações</CardTitle>
          </CardHeader>
          
          <>
            {/* Desktop Table */}
            <CardContent className="p-0 hidden md:block">
              <DataTable 
                columns={requestColumns}
                data={requests || []}
                isLoading={isLoading}
              />
            </CardContent>

            {/* Mobile Table */}
            <CardContent className="p-0 md:hidden">
              <DataTable 
                columns={mobileRequestColumns}
                data={requests || []}
                isLoading={isLoading}
              />
            </CardContent>
            
            {isLoading && (
              <div className="p-8 flex justify-center">
                <Skeleton className="h-32 w-full" />
              </div>
            )}
            
            {!isLoading && requests?.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-neutral-500 mb-4">Você ainda não possui solicitações de frete.</p>
                <Button
                  onClick={() => navigate("/requests/new")}
                  className="bg-primary hover:bg-primary-dark"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Criar Primeira Solicitação
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