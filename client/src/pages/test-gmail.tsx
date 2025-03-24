import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Definir os schemas para validação
const emailTestSchema = z.object({
  to: z.string().email({ message: 'Informe um email válido' }),
  subject: z.string().min(3, { message: 'O assunto deve ter pelo menos 3 caracteres' }),
  message: z.string().min(5, { message: 'A mensagem deve ter pelo menos 5 caracteres' }),
});

const freightEmailTestSchema = z.object({
  email: z.string().email({ message: 'Informe um email válido' }),
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres' }),
  requestId: z.coerce.number().optional(),
  clientName: z.string().optional(),
  freightDetails: z.string().optional(),
});

type EmailTestFormValues = z.infer<typeof emailTestSchema>;
type FreightEmailTestFormValues = z.infer<typeof freightEmailTestSchema>;

export default function TestGmailPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form para teste de email simples
  const emailForm = useForm<EmailTestFormValues>({
    resolver: zodResolver(emailTestSchema),
    defaultValues: {
      to: '',
      subject: 'Teste de Email - LogMene',
      message: 'Este é um email de teste enviado pelo sistema LogMene usando a API do Gmail.',
    },
  });

  // Form para teste de email de frete
  const freightEmailForm = useForm<FreightEmailTestFormValues>({
    resolver: zodResolver(freightEmailTestSchema),
    defaultValues: {
      email: '',
      name: 'Empresa Teste',
      requestId: 12345,
      clientName: 'Cliente Teste',
      freightDetails: `
<ul>
  <li><strong>Origem:</strong> São Paulo, SP</li>
  <li><strong>Destino:</strong> Rio de Janeiro, RJ</li>
  <li><strong>Tipo de carga:</strong> Carga Geral</li>
  <li><strong>Peso:</strong> 500 kg</li>
  <li><strong>Valor da Nota Fiscal:</strong> R$ 5.000,00</li>
  <li><strong>Data de Coleta:</strong> 25/03/2025</li>
  <li><strong>Data de Entrega:</strong> 27/03/2025</li>
</ul>
      `,
    },
  });

  const onSubmitEmailTest = async (data: EmailTestFormValues) => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await axios.post('/api/gmail-test', data);
      setResult({
        success: true,
        message: response.data.message || 'Email enviado com sucesso',
      });
      toast({
        title: 'Sucesso!',
        description: 'Email de teste enviado com sucesso.',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      setResult({
        success: false,
        message: error.response?.data?.error || 'Erro ao enviar email',
      });
      toast({
        title: 'Erro',
        description: 'Falha ao enviar email de teste.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitFreightEmailTest = async (data: FreightEmailTestFormValues) => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await axios.post('/api/test/send-freight-request-email', data);
      setResult({
        success: true,
        message: response.data.message || 'Email de frete enviado com sucesso',
      });
      toast({
        title: 'Sucesso!',
        description: 'Email de frete enviado com sucesso.',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Erro ao enviar email de frete:', error);
      setResult({
        success: false,
        message: error.response?.data?.error || 'Erro ao enviar email de frete',
      });
      toast({
        title: 'Erro',
        description: 'Falha ao enviar email de frete.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold mb-6">Teste de Integração com Gmail</h1>
      
      <Tabs defaultValue="simple">
        <TabsList className="mb-6">
          <TabsTrigger value="simple">Email Simples</TabsTrigger>
          <TabsTrigger value="freight">Email de Frete</TabsTrigger>
        </TabsList>
        
        <TabsContent value="simple">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Email</CardTitle>
              <CardDescription>
                Envie um email de teste para verificar a configuração do Gmail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onSubmitEmailTest)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destinatário</FormLabel>
                        <FormControl>
                          <Input placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Email que receberá a mensagem de teste
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={emailForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assunto</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={emailForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Email de Teste'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="freight">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Email de Frete</CardTitle>
              <CardDescription>
                Envie um email simulando a notificação de nova solicitação de frete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...freightEmailForm}>
                <form onSubmit={freightEmailForm.handleSubmit(onSubmitFreightEmailTest)} className="space-y-4">
                  <FormField
                    control={freightEmailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email da Transportadora</FormLabel>
                        <FormControl>
                          <Input placeholder="transportadora@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={freightEmailForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Transportadora</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={freightEmailForm.control}
                      name="requestId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID da Solicitação</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={freightEmailForm.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Cliente</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={freightEmailForm.control}
                    name="freightDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detalhes do Frete (HTML)</FormLabel>
                        <FormControl>
                          <Textarea rows={8} {...field} />
                        </FormControl>
                        <FormDescription>
                          Você pode usar tags HTML para formatar o conteúdo
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Email de Frete'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {result && (
        <div className={`mt-6 p-4 border rounded-md ${result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
          <h3 className={`text-lg font-semibold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.success ? 'Sucesso' : 'Erro'}
          </h3>
          <p className={result.success ? 'text-green-600' : 'text-red-600'}>
            {result.message}
          </p>
        </div>
      )}
    </div>
  );
}