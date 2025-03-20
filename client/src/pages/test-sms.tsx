import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Schema para validação do formulário
const smsTestSchema = z.object({
  phoneNumber: z.string().min(8, {
    message: "O número de telefone deve ter pelo menos 8 dígitos",
  }),
  message: z.string().min(3, {
    message: "A mensagem deve ter pelo menos 3 caracteres",
  }).max(160, {
    message: "A mensagem não deve ter mais de 160 caracteres (limite padrão de SMS)",
  }),
});

type SmsTestFormValues = z.infer<typeof smsTestSchema>;

export default function TestSMSPage() {
  const { toast } = useToast();
  const [result, setResult] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Definir formulário
  const form = useForm<SmsTestFormValues>({
    resolver: zodResolver(smsTestSchema),
    defaultValues: {
      phoneNumber: "+5511",
      message: "Este é um SMS de teste do sistema LogMene. Obrigado por usar nosso serviço!",
    },
  });

  const onSubmit = async (data: SmsTestFormValues) => {
    setIsLoading(true);
    setResult(null);
    
    try {
      // Usar fetch diretamente em vez de apiRequest para maior controle
      const response = await fetch("/api/test/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      // Extrair o JSON da resposta
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || "Erro ao enviar SMS");
      }
      
      setResult(responseData);
      toast({
        title: "Sucesso!",
        description: "Teste de SMS enviado com sucesso.",
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao enviar SMS de teste:", error);
      toast({
        title: "Erro!",
        description: error instanceof Error ? error.message : "Erro ao enviar SMS de teste",
        variant: "destructive",
      });
      
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          setResult(errorData);
        } catch {
          setResult({ error: "Erro ao processar resposta" });
        }
      } else {
        setResult({ error: error instanceof Error ? error.message : String(error) });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto pb-8">
      <Header title="Teste de SMS" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Enviar SMS de Teste</CardTitle>
            <CardDescription>
              Teste o envio de SMS usando o serviço Twilio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+5511987654321"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Formato internacional com código do país (ex: +5511987654321)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Digite a mensagem do SMS"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Máximo de 160 caracteres (limite padrão de SMS)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "Enviar SMS de Teste"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>
              Resposta do servidor sobre o envio do SMS
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="bg-slate-800 p-4 rounded-md">
                <h3 className="font-medium mb-2">
                  {result.success ? (
                    <span className="text-green-400">Sucesso ✓</span>
                  ) : (
                    <span className="text-red-400">Erro ✗</span>
                  )}
                </h3>
                <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-80">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-slate-400 italic text-center py-8">
                Os resultados aparecerão aqui após o envio do teste
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-slate-400">
            <div>
              <p className="mb-1">Notas sobre o serviço Twilio:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Em contas de teste, apenas números verificados podem receber SMS</li>
                <li>Se o modo de bypass estiver ativado, qualquer número será aceito</li>
                <li>Se o modo de simulação estiver ativado, nenhum SMS real será enviado</li>
              </ul>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}