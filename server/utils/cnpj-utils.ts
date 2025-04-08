import { log, logError } from '../logger';

export interface CNPJData {
  cnpj: string;
  nome: string;
  fantasia?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  error?: string;
}

/**
 * Valida um CNPJ
 * 
 * @param cnpj CNPJ para validar (pode incluir pontuação)
 * @returns true se o CNPJ é válido, false caso contrário
 */
export function validateCNPJ(cnpj: string): boolean {
  // Remover caracteres não numéricos
  cnpj = cnpj.replace(/\D/g, '');
  
  // Verificar tamanho
  if (cnpj.length !== 14) return false;
  
  // Verificar se todos os dígitos são iguais (caso inválido)
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  // Cálculo de validação do CNPJ
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  // Primeiro dígito verificador
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  // Segundo dígito verificador
  tamanho += 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

/**
 * Formata um CNPJ com a pontuação padrão
 * 
 * @param cnpj CNPJ sem pontuação
 * @returns CNPJ formatado (xx.xxx.xxx/xxxx-xx)
 */
export function formatCNPJ(cnpj: string): string {
  // Remover caracteres não numéricos
  cnpj = cnpj.replace(/\D/g, '');
  
  // Aplicar máscara
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/**
 * Busca dados de um CNPJ utilizando uma API pública
 * 
 * @param cnpj CNPJ para consulta (apenas números)
 * @returns Dados do CNPJ ou null em caso de erro
 */
export async function fetchCNPJData(cnpj: string): Promise<CNPJData | null> {
  // Remover caracteres não numéricos do CNPJ
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) {
    log(`CNPJ inválido: ${cnpj}`, 'cnpj-utils');
    return null;
  }
  
  try {
    const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
    
    if (response.status === 200) {
      log(`CNPJ encontrado: ${cnpj}`, 'cnpj-utils');
      
      const data = response.data;
      
      return {
        cnpj: cleanCNPJ,
        nome: data.razao_social,
        fantasia: data.nome_fantasia,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
        telefone: data.telefone,
        email: data.email
      };
    } else {
      log(`Erro ao buscar CNPJ ${cnpj}: ${response.status}`, 'cnpj-utils');
      return null;
    }
  } catch (error) {
    log(`Erro ao buscar CNPJ ${cnpj}: ${error}`, 'cnpj-utils');
    
    if (axios.isAxiosError(error) && error.response) {
      log(`Resposta do servidor: ${JSON.stringify(error.response.data)}`, 'cnpj-utils');
      
      return {
        cnpj: cleanCNPJ,
        nome: '',
        error: error.response.data.message || 'CNPJ não encontrado'
      };
    }
    
    return null;
  }
}

/**
 * Formata um endereço completo a partir dos dados do CNPJ
 * 
 * @param data Dados do CNPJ
 * @returns Endereço formatado
 */
export function formatAddress(data: CNPJData): string {
  if (!data) return '';
  
  const parts = [
    data.logradouro,
    data.numero ? `nº ${data.numero}` : '',
    data.complemento,
    data.bairro,
    data.municipio && data.uf ? `${data.municipio}/${data.uf}` : '',
    data.cep ? `CEP ${data.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}` : ''
  ];
  
  return parts.filter(part => part).join(', ');
} 