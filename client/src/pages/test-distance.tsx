import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

// Schema para o formulário de teste de distância
const distanceTestSchema = z.object({
  origin: z.string().min(5, 'Endereço de origem deve ter pelo menos 5 caracteres'),
  destination: z.string().min(5, 'Endereço de destino deve ter pelo menos 5 caracteres'),
});

type DistanceTestFormValues = z.infer<typeof distanceTestSchema>;

type DistanceResult = {
  success: boolean;
  distance?: number;
  distanceText?: string;
  duration?: number;
  durationText?: string;
  unit?: string;
  error?: string;
};

export default function TestDistancePage() {
  const [result, setResult] = useState<DistanceResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Configuração do formulário com React Hook Form + Zod
  const form = useForm<DistanceTestFormValues>({
    resolver: zodResolver(distanceTestSchema),
    defaultValues: {
      origin: '',
      destination: '',
    },
  });

  // Handler para envio do formulário
  const onSubmit = async (data: DistanceTestFormValues) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/distance', data);
      setResult(response.data);
      
      if (response.data.success) {
        toast({
          title: 'Sucesso!',
          description: `Distância calculada: ${response.data.distanceText || 'N/A'}, Tempo estimado: ${response.data.durationText || 'N/A'}`,
        });
      } else {
        toast({
          title: 'Erro no cálculo',
          description: response.data.error || 'Não foi possível calcular a distância',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao calcular distância:', error);
      toast({
        title: 'Erro!',
        description: 'Não foi possível processar sua solicitação',
        variant: 'destructive',
      });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col space-y-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">Teste de Cálculo de Distância</h1>
        <p className="text-muted-foreground">
          Esta página permite testar o cálculo de distâncias entre endereços usando a Google Routes API.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Calcular Distância</CardTitle>
            <CardDescription>
              Informe os endereços de origem e destino para calcular a distância e o tempo estimado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço de Origem</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Av. Paulista, 1000, São Paulo, SP" 
                          {...field} 
                          disabled={loading}
                        />
                      </FormControl>
                      <FormDescription>
                        Informe o endereço completo para melhores resultados
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço de Destino</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Rua Oscar Freire, 500, São Paulo, SP" 
                          {...field} 
                          disabled={loading}
                        />
                      </FormControl>
                      <FormDescription>
                        Informe o endereço completo para melhores resultados
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={loading}>
                  {loading ? 'Calculando...' : 'Calcular Distância'}
                </Button>
              </form>
            </Form>
          </CardContent>
          
          {result && (
            <CardFooter className="flex flex-col items-start">
              <h3 className="text-lg font-semibold mb-2">Resultado:</h3>
              {result.success ? (
                <div className="space-y-2 w-full">
                  <div className="flex justify-between w-full border-b pb-2">
                    <span className="font-medium">Distância:</span>
                    <span>{result.distanceText || `${result.distance} ${result.unit || 'km'}`}</span>
                  </div>
                  <div className="flex justify-between w-full border-b pb-2">
                    <span className="font-medium">Tempo estimado:</span>
                    <span>{result.durationText || `${Math.round(result.duration || 0)} minutos`}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-4">
                    {result.distanceText?.includes('~') ? 
                      'Nota: Valores aproximados calculados pelo método simplificado' : 
                      'Valores calculados pela Google Routes API'}
                  </div>
                </div>
              ) : (
                <div className="text-red-500">
                  {result.error || 'Não foi possível calcular a distância'}
                </div>
              )}
            </CardFooter>
          )}
        </Card>
        
        <div className="text-sm text-muted-foreground">
          <p>Esta funcionalidade usa a Google Routes API para cálculos precisos de distância.</p>
          <p>Em caso de falha da API, um método simplificado de estimativa é usado como backup.</p>
        </div>
      </div>
    </div>
  );
}