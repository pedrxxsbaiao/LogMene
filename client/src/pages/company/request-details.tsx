import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Flag, ArrowDownIcon, Package, CheckCircle, User, Clock } from "lucide-react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { DeliveryProofUploader } from "@/components/delivery-proof-uploader";
import { RouteMap } from "@/components/route-map";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatISODateToDisplay } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FreightRequestWithQuote } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyRequestDetailsPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  
  const requestId = params.id ? parseInt(params.id) : 0;
  
  // Buscar detalhes da solicitação
  const { data: request, isLoading } = useQuery<FreightRequestWithQuote>({
    queryKey: [`/api/resources?op=freight-requests&id=${requestId}`],
    enabled: requestId > 0,
  });

  // Mutation para marcar como concluído
  const completeRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/resources?op=freight-requests&id=${requestId}&action=complete`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Solicitação concluída",
        description: "A solicitação foi marcada como concluída e o cliente foi notificado.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/resources?op=freight-requests&id=${requestId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/resources?op=freight-requests&status=active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao marcar a solicitação como concluída.",
        variant: "destructive",
      });
    },
  });

  const handleComplete = () => {
    setCompleteConfirmOpen(true);
  };

  const confirmComplete = () => {
    completeRequestMutation.mutate();
    setCompleteConfirmOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="flex items-center text-primary p-0 h-auto"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-bold text-neutral-700">
                <Skeleton className="h-8 w-64" />
              </CardTitle>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="flex items-center text-primary p-0 h-auto"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h2 className="text-xl font-bold text-neutral-700">Solicitação não encontrada</h2>
                <p className="text-neutral-500 mt-2">A solicitação que você está procurando não foi encontrada.</p>
              </div>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="flex items-center text-primary p-0 h-auto"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-bold text-neutral-700">
              Solicitação #{request.id}
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={request.status} />
              
              {request.status === "accepted" && (
                <Button 
                  size="sm"
                  onClick={handleComplete}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Finalizar Entrega
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Cliente */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-700 mb-3 flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" />
                Cliente
              </h3>
              <div className="p-3 rounded-md bg-neutral-100">
                <p className="font-medium">{request.clientName || 'Cliente'}</p>
              </div>
            </div>
            
            {/* Route Information */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-700 mb-3">Rota</h3>
              <div className="flex flex-col md:flex-row items-start md:items-center text-neutral-700">
                <div className="flex items-center">
                  <MapPin className="text-primary mr-2 h-5 w-5" />
                  <span className="font-medium">
                    {request.originStreet}, {request.originCity} - {request.originState}
                  </span>
                </div>
                <div className="hidden md:block mx-4">
                  <ArrowDownIcon className="rotate-90 text-neutral-400 h-5 w-5" />
                </div>
                <div className="md:hidden my-2">
                  <ArrowDownIcon className="text-neutral-400 h-5 w-5" />
                </div>
                <div className="flex items-center">
                  <Flag className="text-[#00ACC1] mr-2 h-5 w-5" />
                  <span className="font-medium">
                    {request.destinationStreet}, {request.destinationCity} - {request.destinationState}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Cargo Details */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-700 mb-3">Detalhes da Carga</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Tipo</p>
                  <p className="font-medium text-neutral-700">
                    {request.cargoType === "general" && "Carga Geral"}
                    {request.cargoType === "fragile" && "Frágil"}
                    {request.cargoType === "perishable" && "Perecível"}
                    {request.cargoType === "dangerous" && "Perigosa"}
                    {request.cargoType === "fractional" && "Carga Fracionada"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Peso</p>
                  <p className="font-medium text-neutral-700">{request.weight} kg</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Valor da Nota Fiscal</p>
                  <p className="font-medium text-neutral-700">{formatCurrency(request.invoiceValue || 0)}</p>
                </div>
              </div>
            </div>
            
            {/* Mapa da Rota removido conforme solicitado */}
            
            {/* Dates */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-700 mb-3">Datas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Solicitado em</p>
                  <p className="font-medium text-neutral-700">
                    {request.createdAt && formatISODateToDisplay(request.createdAt.toString())}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Retirada</p>
                  <p className="font-medium text-neutral-700">{formatISODateToDisplay(request.pickupDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Entrega Desejada</p>
                  <p className="font-medium text-neutral-700">{formatISODateToDisplay(request.deliveryDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Concluído em</p>
                  <p className="font-medium text-neutral-700">
                    {request.completedAt ? formatISODateToDisplay(request.completedAt.toString()) : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quote Information */}
            {request.quote && (
              <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/30">
                <h3 className="text-lg font-medium text-neutral-700 mb-3">Cotação Enviada</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-neutral-500">Valor</p>
                    <p className="font-medium text-neutral-700">{formatCurrency(request.quote.value)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Prazo Estimado</p>
                    <p className="font-medium text-neutral-700">{request.quote.estimatedDays} dias</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Cotado em</p>
                    <p className="font-medium text-neutral-700">
                      {request.quote.createdAt && formatISODateToDisplay(request.quote.createdAt.toString())}
                    </p>
                  </div>
                </div>
                {request.quote.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-neutral-500">Observações da cotação</p>
                    <p className="text-neutral-700">{request.quote.notes}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Notes */}
            {request.notes && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-neutral-700 mb-3">Observações</h3>
                <p className="text-neutral-700">{request.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Delivery Proof Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-neutral-700 mb-3">
            <div className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-primary" />
              Comprovante de Entrega
            </div>
          </h3>
          <DeliveryProofUploader 
            requestId={request.id} 
            requestStatus={request.status}
            onSuccess={() => {
              toast({
                title: "Comprovante enviado",
                description: "O comprovante de entrega foi enviado com sucesso e o cliente foi notificado."
              });
              queryClient.invalidateQueries({ queryKey: [`/api/resources?op=freight-requests&id=${requestId}`] });
            }}
          />
        </div>
      </main>
      
      <BottomNavigation />
      
      {/* Confirm Complete Dialog */}
      <AlertDialog open={completeConfirmOpen} onOpenChange={setCompleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar solicitação como concluída?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso indicará que a entrega foi realizada com sucesso. 
              O cliente receberá uma notificação sobre a conclusão do frete.
              {!request.deliveryProof && (
                <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-amber-700">
                  <Clock className="inline-block h-4 w-4 mr-1" />
                  Atenção: É recomendado enviar um comprovante de entrega antes de finalizar.
                  <p className="mt-1 text-sm">Você pode enviar o comprovante após finalizar, mas é melhor fazê-lo antes.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmComplete}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar Conclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}