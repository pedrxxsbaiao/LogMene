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
}

/**
 * Formata um CNPJ com a pontuação padrão
 * 
 * @param cnpj CNPJ sem pontuação
 * @returns CNPJ formatado (xx.xxx.xxx/xxxx-xx)
 */
export function formatCNPJ(cnpj: string): string {
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/\D/g, '');
  
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