import axios from 'axios';
import { validateCNPJ, fetchCNPJData } from '../../../server/utils/cnpj-utils';

// Interface para os dados de endereço retornados pela API
/**
 * Valida um CNPJ
 * 
 * @param {string} cnpj CNPJ para validar (pode incluir pontuação)
 * @returns {boolean} true se o CNPJ é válido, false caso contrário
 */
function validateCNPJ(cnpj) {
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
 * Formata um endereço completo a partir dos dados do CNPJ
 * 
 * @param {Object} data Dados do CNPJ
 * @returns {string} Endereço formatado
 */
function formatAddress(data) {
  if (!data) return '';
  
  const parts = [
    data.logradouro,
    data.numero ? `nº ${data.numero}` : '',
    data.complemento,
    data.bairro,
    data.municipio && data.uf ? `${data.municipio}/${data.uf}` : '',
    data.cep ? `CEP ${data.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}` : ''
  ];
  
  // Filtrar elementos vazios e juntar com vírgula
  return parts.filter(part => part).join(', ');
}

/**
 * Busca dados de um CNPJ utilizando uma API pública
 * 
 * @param {string} cnpj CNPJ para consulta (apenas números)
 * @returns {Promise<Object|null>} Dados do CNPJ ou null em caso de erro
 */
async function fetchCNPJData(cnpj) {
  // Remover caracteres não numéricos do CNPJ
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) {
    console.log(`CNPJ inválido: ${cnpj}`);
    return null;
  }
  
  try {
    // Usando API pública para consulta de CNPJ
    // Note: Existem várias APIs públicas, algumas podem requerer API key ou ter limites de uso
    const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
    
    if (response.status === 200) {
      console.log(`CNPJ encontrado: ${cnpj}`);
      
      // Mapeando os dados da API para nossa interface
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
      console.log(`Erro ao buscar CNPJ ${cnpj}: ${response.status}`);
      return null;
    }
  } catch (error) {
    // Se a API retornar erro (CNPJ não encontrado, etc.)
    console.log(`Erro ao buscar CNPJ ${cnpj}: ${error}`);
    
    // Verificar se é um erro de API com resposta
    if (error.response) {
      console.log(`Resposta do servidor: ${JSON.stringify(error.response.data)}`);
      
      // Retornamos um objeto com erro para diferenciar de um null por outras razões
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
 * Handler específico para Vercel serverless function
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const { cnpj } = req.query;

  if (!cnpj) {
    return res.status(400).json({ success: false, error: 'CNPJ não fornecido' });
  }

  // Validar o CNPJ
  if (!validateCNPJ(cnpj)) {
    return res.status(400).json({ success: false, error: 'CNPJ inválido' });
  }

  try {
    // Buscar dados do CNPJ
    const data = await fetchCNPJData(cnpj);

    if (!data) {
      return res.status(404).json({ success: false, error: 'CNPJ não encontrado' });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar CNPJ' });
  }
}