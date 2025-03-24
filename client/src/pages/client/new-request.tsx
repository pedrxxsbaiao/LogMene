import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
import { insertFreightRequestSchema } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Define the form schema based on the freight request schema
const formSchema = insertFreightRequestSchema.omit({ 
  userId: true, 
  status: true
});

export default function NewRequestPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const cargoTypes = [
    { value: "general", label: "Carga Geral" },
    { value: "fragile", label: "Frágil" },
    { value: "perishable", label: "Perecível" },
    { value: "dangerous", label: "Perigosa" },
    { value: "fractional", label: "Carga Fracionada" },
  ];

  // Estender e validar o schema para datas
  const extendedFormSchema = formSchema.extend({
    pickupDate: z.string().nonempty({ message: "Data de retirada é obrigatória" }),
    deliveryDate: z.string().nonempty({ message: "Data de entrega é obrigatória" }),
    cargoType: z.string().nonempty({ message: "Tipo de carga é obrigatório" }),
    originCity: z.string().nonempty({ message: "Cidade de origem é obrigatória" }),
    originState: z.string().nonempty({ message: "Estado de origem é obrigatório" }),
    destinationCity: z.string().nonempty({ message: "Cidade de destino é obrigatória" }),
    destinationState: z.string().nonempty({ message: "Estado de destino é obrigatório" }),
    invoiceValue: z.number({ required_error: "Valor da nota é obrigatório" }).min(0.01, { message: "Valor da nota deve ser maior que zero" }),
    // Campos adicionais
    originCNPJ: z.string().optional(),
    originCompanyName: z.string().optional(),
    originZipCode: z.string().optional(),
    destinationCNPJ: z.string().optional(),
    destinationCompanyName: z.string().optional(),
    destinationZipCode: z.string().optional(),
    cargoDescription: z.string().optional(),
    packageQuantity: z.number().int().positive().optional(),
  });

  // Create the form
  const form = useForm<z.infer<typeof extendedFormSchema>>({
    resolver: zodResolver(extendedFormSchema),
    defaultValues: {
      // Campos de origem
      originCNPJ: "",
      originCompanyName: "",
      originStreet: "",
      originCity: "",
      originState: "",
      originZipCode: "",
      // Campos de destino
      destinationCNPJ: "",
      destinationCompanyName: "",
      destinationStreet: "",
      destinationCity: "",
      destinationState: "",
      destinationZipCode: "",
      // Informações da carga
      cargoType: "",
      weight: undefined, 
      volume: undefined,
      invoiceValue: undefined,
      cargoDescription: "",
      packageQuantity: undefined,
      // Outros campos
      pickupDate: "",
      deliveryDate: "",
      notes: "",
      requireInsurance: false,
    },
  });

  // Create request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof extendedFormSchema>) => {
      try {
        const res = await apiRequest("POST", "/api/requests", data);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Erro ao criar solicitação");
        }
        return res.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Erro ao criar solicitação");
      }
    },
    onSuccess: () => {
      toast({
        title: "Solicitação criada",
        description: "Sua solicitação de frete foi enviada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      navigate("/");
    },
    onError: (error: Error) => {
      console.error("Erro na criação da solicitação:", error);
      toast({
        title: "Erro ao criar solicitação",
        description: error.message || "Não foi possível criar a solicitação. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Submit handler
  function onSubmit(values: z.infer<typeof extendedFormSchema>) {
    console.log("Enviando valores:", values);
    
    // Convertendo undefined para 0 ou valores padrão antes de enviar para o backend
    const formattedValues = {
      ...values,
      // Campos numéricos
      weight: values.weight === undefined ? 0 : values.weight,
      volume: values.volume === undefined ? 0 : values.volume,
      invoiceValue: values.invoiceValue === undefined ? 0 : values.invoiceValue,
      packageQuantity: values.packageQuantity === undefined ? 0 : values.packageQuantity,
      
      // Strings opcionais (garantindo que sejam strings vazias e não undefined)
      originCNPJ: values.originCNPJ || "",
      originCompanyName: values.originCompanyName || "",
      originZipCode: values.originZipCode || "",
      destinationCNPJ: values.destinationCNPJ || "",
      destinationCompanyName: values.destinationCompanyName || "",
      destinationZipCode: values.destinationZipCode || "",
      cargoDescription: values.cargoDescription || ""
    };
    
    createRequestMutation.mutate(formattedValues);
  }

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
            <CardTitle className="text-xl font-bold text-neutral-700">Nova Solicitação de Frete</CardTitle>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Origin and Destination */}
                <div className="grid grid-cols-1 gap-6">
                  <AddressInput 
                    form={form}
                    fieldPrefix="origin"
                    label="Origem"
                    description="Endereço de origem da carga"
                  />
                  <AddressInput 
                    form={form}
                    fieldPrefix="destination"
                    label="Destino"
                    description="Endereço de destino da carga"
                  />
                </div>
                
                {/* Cargo Details */}
                <div>
                  <h3 className="text-lg font-medium text-neutral-700 mb-3">Detalhes da Carga</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="cargoType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Carga</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cargoTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
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
                              step="0.01"
                              placeholder="Informe o peso"
                              value={field.value === 0 || field.value === undefined ? "" : field.value}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="volume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Volume (m³)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01"
                              placeholder="Informe o volume"
                              value={field.value === 0 || field.value === undefined ? "" : field.value}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoiceValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor da Nota (R$)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0.01" 
                              step="0.01"
                              placeholder="Informe o valor da nota"
                              value={field.value === 0 || field.value === undefined ? "" : field.value}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Campos adicionais de informações da carga */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="packageQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade de Volumes</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              step="1"
                              placeholder="Quantidade de caixas/paletes/volumes"
                              value={field.value === 0 || field.value === undefined || field.value === null ? "" : field.value}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Número total de volumes a serem transportados
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="cargoDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição da Carga</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: Produtos eletrônicos, móveis, etc."
                              value={field.value || ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              className="bg-white text-black border-neutral-300"
                            />
                          </FormControl>
                          <FormDescription>
                            Descrição detalhada dos itens a serem transportados
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Dates */}
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
                                className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "dd/MM/yyyy", { locale: ptBR })
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
                              onSelect={(date) => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                              }}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
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
                                className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "dd/MM/yyyy", { locale: ptBR })
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
                              onSelect={(date) => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                              }}
                              disabled={(date) => {
                                // Desabilitar datas anteriores à data de retirada ou à data atual
                                const today = new Date(new Date().setHours(0, 0, 0, 0));
                                const pickupDate = form.getValues("pickupDate") 
                                  ? new Date(form.getValues("pickupDate")) 
                                  : today;
                                return date < (pickupDate > today ? pickupDate : today);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Additional Information */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Informações adicionais sobre o frete"
                          rows={3}
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          name={field.name}
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={Boolean(field.value)}
                          onCheckedChange={(checked) => field.onChange(checked ? true : false)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Solicitar seguro para a carga</FormLabel>
                        <FormDescription>
                          A transportadora incluirá o valor do seguro na cotação.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="mr-2"
                    onClick={() => navigate("/")}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createRequestMutation.isPending}
                  >
                    {createRequestMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
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
