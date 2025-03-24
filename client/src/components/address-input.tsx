import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { Search, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type AddressInputProps = {
  form: UseFormReturn<any>;
  fieldPrefix: string;
  label: string;
  description?: string;
};

interface CNPJData {
  nome: string;
  fantasia?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  formattedAddress?: string;
}

export function AddressInput({ form, fieldPrefix, label, description }: AddressInputProps) {
  const [loading, setLoading] = useState(false);

  // Função para formatar o CNPJ enquanto o usuário digita
  const formatCNPJ = (value: string) => {
    // Remove caracteres não numéricos
    const cnpj = value.replace(/\D/g, '');
    
    // Aplica a máscara XX.XXX.XXX/XXXX-XX
    if (cnpj.length <= 2) {
      return cnpj;
    } else if (cnpj.length <= 5) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
    } else if (cnpj.length <= 8) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
    } else if (cnpj.length <= 12) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
    } else {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
    }
  };

  // Função que lida com a busca de CNPJ
  const handleCNPJSearch = async () => {
    const cnpj = form.getValues(`${fieldPrefix}CNPJ`);
    
    if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
      toast({
        title: "CNPJ inválido",
        description: "Por favor, informe um CNPJ válido com 14 dígitos.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Remover caracteres não numéricos para a chamada da API
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      const response = await axios.get(`/api/cnpj/${cleanCNPJ}`);
      
      if (response.data.success) {
        const data = response.data.data as CNPJData;
        
        // Preencher o formulário com os dados retornados
        form.setValue(`${fieldPrefix}CompanyName`, data.nome);
        
        if (data.logradouro) {
          // Combinar logradouro, número e complemento
          const endereco = [
            data.logradouro,
            data.numero ? `nº ${data.numero}` : '',
            data.complemento || ''
          ].filter(Boolean).join(', ');
          
          form.setValue(`${fieldPrefix}Street`, endereco);
        }
        
        if (data.municipio) {
          form.setValue(`${fieldPrefix}City`, data.municipio);
        }
        
        if (data.uf) {
          form.setValue(`${fieldPrefix}State`, data.uf);
        }
        
        if (data.cep) {
          form.setValue(`${fieldPrefix}ZipCode`, data.cep);
        }
        
        toast({
          title: "CNPJ encontrado",
          description: `Dados de ${data.nome} carregados com sucesso.`,
        });
      } else {
        toast({
          title: "CNPJ não encontrado",
          description: "Não foi possível obter os dados para este CNPJ.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar CNPJ:", error);
      toast({
        title: "Erro ao buscar CNPJ",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao buscar os dados do CNPJ.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-md border border-neutral-200 shadow-sm">
      <h3 className="text-lg font-medium text-neutral-700 mb-2">{label}</h3>
      {description && <p className="text-sm text-neutral-500 mb-4">{description}</p>}
      
      <div className="grid grid-cols-1 gap-4">
        {/* Campo de CNPJ com botão de busca */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name={`${fieldPrefix}CNPJ`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ (opcional)</FormLabel>
                  <FormControl>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Ex: 00.000.000/0000-00" 
                        {...field}
                        value={field.value ? formatCNPJ(field.value) : ""}
                        onChange={(e) => {
                          // Limitar a 18 caracteres (CNPJ formatado)
                          if (e.target.value.length <= 18) {
                            field.onChange(e.target.value);
                          }
                        }}
                        className="bg-white text-black border-neutral-300"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCNPJSearch}
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Informe o CNPJ para preencher os campos automaticamente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name={`${fieldPrefix}CompanyName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Empresa</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Nome da empresa" 
                    {...field} 
                    className="bg-white text-black border-neutral-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name={`${fieldPrefix}Street`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rua e Número</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Av. Paulista, 1000" 
                  {...field} 
                  className="bg-white text-black border-neutral-300"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name={`${fieldPrefix}City`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: São Paulo" 
                    {...field} 
                    className="bg-white text-black border-neutral-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name={`${fieldPrefix}State`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: SP" 
                    {...field} 
                    className="bg-white text-black border-neutral-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name={`${fieldPrefix}ZipCode`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: 01310-100" 
                    {...field} 
                    className="bg-white text-black border-neutral-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}