import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AddressInput } from "@/components/address-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertFreightRequestSchema, FreightRequestWithQuote } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";

// Define the form schema based on the freight request schema
const formSchema = insertFreightRequestSchema.omit({ 
  userId: true, 
  status: true,
  volume: true // Removendo campo de volume do schema
});

// Tipagem para o formulário
type FreightRequestFormValues = z.infer<typeof formSchema>;

export default function EditRequestPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const requestId = params.id ? parseInt(params.id) : 0;

  // Carregar os dados existentes da solicitação
  const { data: request, isLoading, error } = useQuery<FreightRequestWithQuote>({
    queryKey: [`/api/requests/${requestId}`],
    enabled: requestId > 0
  });

  // Mutation para atualizar solicitação
  const updateMutation = useMutation({
    mutationFn: async (values: FreightRequestFormValues) => {
      const res = await apiRequest(
        "PUT", 
        `/api/requests/${requestId}`, 
        values
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Solicitação atualizada",
        description: "Sua solicitação de frete foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      navigate(`/requests/${requestId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar solicitação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form com validação para edição de frete
  const form = useForm<FreightRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // Os valores serão preenchidos no useEffect ao carregar a solicitação
      originCNPJ: "",
      originCompanyName: "",
      originStreet: "",
      originCity: "",
      originState: "",
      destinationCNPJ: "",
      destinationCompanyName: "",
      destinationStreet: "",
      destinationCity: "",
      destinationState: "",
      cargoType: "general",
      weight: 0,
      packageQuantity: undefined,
      pickupDate: new Date().toISOString(),
      deliveryDate: new Date().toISOString(),
      requireInsurance: false,
      notes: "",
    },
  });

  // Atualizar o formulário quando os dados forem carregados
  useEffect(() => {
    if (request && request.status === "pending") {
      // Formatando as datas para o formato esperado pelo formulário
      const pickupDate = request.pickupDate ? new Date(request.pickupDate).toISOString() : new Date().toISOString();
      const deliveryDate = request.deliveryDate ? new Date(request.deliveryDate).toISOString() : new Date().toISOString();
      
      form.reset({
        originCNPJ: request.originCNPJ || "",
        originCompanyName: request.originCompanyName || "",
        originStreet: request.originStreet,
        originCity: request.originCity,
        originState: request.originState,
        destinationCNPJ: request.destinationCNPJ || "",
        destinationCompanyName: request.destinationCompanyName || "",
        destinationStreet: request.destinationStreet,
        destinationCity: request.destinationCity,
        destinationState: request.destinationState,
        cargoType: request.cargoType || "general",
        weight: request.weight,
        packageQuantity: request.packageQuantity,
        pickupDate,
        deliveryDate,
        requireInsurance: request.requireInsurance || false,
        notes: request.notes || "",
      });
    } else if (request && request.status !== "pending") {
      // Se a solicitação não estiver pendente, redirecionar para a página de detalhes
      toast({
        title: "Não é possível editar",
        description: "Apenas solicitações pendentes podem ser editadas.",
        variant: "destructive",
      });
      navigate(`/requests/${requestId}`);
    }
  }, [request, form, navigate, requestId, toast]);

  // Enviar o formulário - atualiza a solicitação
  function onSubmit(values: FreightRequestFormValues) {
    updateMutation.mutate(values);
  }

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
            <CardHeader>
              <CardTitle className="text-xl font-bold text-neutral-700">
                <Skeleton className="h-8 w-48" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (error || !request) {
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
            <CardHeader>
              <CardTitle className="text-xl font-bold text-neutral-700">
                Erro ao carregar solicitação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-500">
                Não foi possível carregar os dados da solicitação. Por favor, tente novamente.
              </p>
              <Button 
                className="mt-4"
                onClick={() => navigate(`/requests/${requestId}`)}
              >
                Voltar para detalhes
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="flex items-center text-primary p-0 h-auto"
            onClick={() => navigate(`/requests/${requestId}`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar para detalhes
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-neutral-700">
              Editar Solicitação de Frete #{requestId}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Origem */}
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-neutral-700 mb-4">Origem</h3>
                  <AddressInput
                    form={form}
                    fieldPrefix="origin"
                    label="Endereço de Origem"
                    description="Informe o endereço completo do local de retirada da mercadoria"
                  />
                </div>
                
                {/* Destino */}
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-neutral-700 mb-4">Destino</h3>
                  <AddressInput
                    form={form}
                    fieldPrefix="destination"
                    label="Endereço de Destino"
                    description="Informe o endereço completo do local de entrega da mercadoria"
                  />
                </div>
                
                {/* Detalhes da Carga */}
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-neutral-700 mb-4">Detalhes da Carga</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="cargoType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Carga</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de carga" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general">Carga Geral</SelectItem>
                              <SelectItem value="fragile">Frágil</SelectItem>
                              <SelectItem value="perishable">Perecível</SelectItem>
                              <SelectItem value="dangerous">Perigosa</SelectItem>
                              <SelectItem value="fractional">Carga Fracionada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.1" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packageQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade de Volumes (opcional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => 
                                field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="requireInsurance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Requer Seguro de Carga</FormLabel>
                            <FormDescription>
                              Selecione esta opção se desejar contratar seguro para a carga
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Datas */}
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-neutral-700 mb-4">Datas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="pickupDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Retirada</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP", { locale: ptBR })
                                  ) : (
                                    <span>Selecione uma data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString() ?? "")}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Entrega Desejada</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP", { locale: ptBR })
                                  ) : (
                                    <span>Selecione uma data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString() ?? "")}
                                disabled={(date) => {
                                  const pickupDate = form.getValues("pickupDate");
                                  return pickupDate && date < new Date(pickupDate);
                                }}
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Observações */}
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-neutral-700 mb-4">Observações</h3>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Informe detalhes adicionais sobre sua carga ou requisitos especiais"
                            className="resize-none"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/requests/${requestId}`)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      
      <BottomNavigation />
    </div>
  );
}