import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeliveryProof, FreightRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Clock, FileCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Esquema de validação para o formulário de upload
const deliveryProofSchema = z.object({
  proofImage: z.string().min(5, {
    message: "A imagem é obrigatória",
  }),
  clientInvoiceNumber: z.string().min(1, {
    message: "O número da nota do cliente é obrigatório",
  }),
  cteNumber: z.string().min(1, {
    message: "O número do CTE é obrigatório",
  }),
  notes: z.string().optional(),
});

type DeliveryProofUploaderProps = {
  requestId: number;
  requestStatus: string;
  onSuccess?: () => void;
};

export function DeliveryProofUploader({ requestId, requestStatus, onSuccess }: DeliveryProofUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isViewMode, setIsViewMode] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Buscar comprovante existente
  const { 
    data: existingProof,
    isLoading: isLoadingProof
  } = useQuery<DeliveryProof>({
    queryKey: [`/api/requests/${requestId}/delivery-proof`],
    enabled: requestStatus === "accepted" || requestStatus === "completed",
    // Se a requisição falhar com 404, não tratar como erro, apenas retornar undefined
    retry: (failureCount, error: any) => {
      return failureCount < 1 && error.status !== 404;
    },
  });

  // Definição do formulário
  const form = useForm<z.infer<typeof deliveryProofSchema>>({
    resolver: zodResolver(deliveryProofSchema),
    defaultValues: {
      proofImage: "",
      clientInvoiceNumber: "",
      cteNumber: "",
      notes: "",
    },
  });

  // Mutação para upload do comprovante
  const uploadMutation = useMutation({
    mutationFn: async (values: z.infer<typeof deliveryProofSchema>) => {
      const response = await apiRequest("POST", "/api/delivery-proofs", {
        requestId,
        proofImage: values.proofImage,
        clientInvoiceNumber: values.clientInvoiceNumber,
        cteNumber: values.cteNumber,
        notes: values.notes || "",
      });
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comprovante enviado",
        description: "Comprovante de entrega enviado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}/delivery-proof`] });
      queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}`] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar comprovante",
        description: error.message || "Ocorreu um erro ao enviar o comprovante de entrega.",
        variant: "destructive",
      });
    },
  });

  // Função para converter arquivo em base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handler para upload de imagem
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsUploading(true);
    try {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        
        // Verificar se o arquivo é uma imagem
        if (!file.type.match('image.*')) {
          toast({
            title: "Formato inválido",
            description: "Por favor, selecione um arquivo de imagem válido (JPG, PNG, etc).",
            variant: "destructive",
          });
          return;
        }
        
        // Verificar o tamanho do arquivo (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: "O tamanho máximo permitido é 5MB.",
            variant: "destructive",
          });
          return;
        }
        
        // Converter para base64
        const base64 = await convertToBase64(file);
        setImagePreview(base64);
        form.setValue("proofImage", base64);
      }
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      toast({
        title: "Erro ao processar imagem",
        description: "Ocorreu um erro ao processar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  function onSubmit(values: z.infer<typeof deliveryProofSchema>) {
    uploadMutation.mutate(values);
  }

  // Se o comprovante já existe, mostrar em modo de visualização
  if (existingProof) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileCheck className="h-5 w-5 mr-2 text-green-500" />
            Comprovante de Entrega
          </CardTitle>
          <CardDescription>
            Enviado em {existingProof.createdAt ? new Date(existingProof.createdAt).toLocaleDateString('pt-BR') : '-'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informações do comprovante - Acima da imagem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-md p-4 bg-muted/10 mb-4">
            <div>
              <h4 className="font-medium text-sm">Número da Nota Cliente:</h4>
              <p className="text-base font-semibold text-neutral-700">
                {existingProof.clientInvoiceNumber || 'Não informado'}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">Número do CTE:</h4>
              <p className="text-base font-semibold text-neutral-700">
                {existingProof.cteNumber || 'Não informado'}
              </p>
            </div>
          </div>
          
          {/* Imagem do comprovante com tamanho reduzido */}
          <div className="rounded-md overflow-hidden border bg-muted/20">
            <img 
              src={existingProof.proofImage} 
              alt="Comprovante de entrega" 
              className="w-full max-h-96 object-contain mx-auto"
            />
          </div>
          
          {existingProof.notes && (
            <div>
              <h4 className="font-medium mb-1 text-sm">Observações:</h4>
              <p className="text-sm text-muted-foreground">{existingProof.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Se a requisição não foi aceita, não mostrar o uploader
  if (requestStatus !== "accepted") {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
            Comprovante de Entrega
          </CardTitle>
          <CardDescription>
            O comprovante de entrega só pode ser enviado quando a solicitação for aceita.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Formulário de upload
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="h-5 w-5 mr-2 text-primary" />
          Enviar Comprovante de Entrega
        </CardTitle>
        <CardDescription>
          Selecione uma imagem do seu dispositivo ou forneça uma URL
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Área de upload de arquivo */}
            <div className="mb-4">
              <FormLabel>Enviar imagem do dispositivo</FormLabel>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 transition-colors hover:border-primary/50 cursor-pointer">
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Formatos suportados: JPG, PNG, GIF (máx. 5MB)
                </p>
              </div>
            </div>
            
            {/* Preview da imagem se disponível */}
            {imagePreview && (
              <div className="mb-4">
                <FormLabel>Preview da imagem</FormLabel>
                <div className="rounded-md overflow-hidden border bg-muted/20">
                  <img 
                    src={imagePreview} 
                    alt="Preview do comprovante" 
                    className="w-full max-h-80 object-contain mx-auto"
                  />
                </div>
              </div>
            )}
            
            {/* Ou URL da imagem */}
            <div className="relative mb-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  ou use uma URL
                </span>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="proofImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://exemplo.com/imagem.jpg" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Link direto para a imagem do comprovante de entrega
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientInvoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Nota Cliente</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: NF-123456" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Número da nota fiscal do cliente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cteNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do CTE</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: CTE-789012" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Conhecimento de Transporte Eletrônico
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais sobre a entrega..." 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Enviando..." : "Enviar Comprovante"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}