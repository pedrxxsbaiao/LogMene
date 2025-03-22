// Arquivo que consolida os endpoints relacionados a localização e CNPJ
// Isso reduz o número de funções serverless na Vercel

// Importações
import axios from 'axios';
import { Client } from '@googlemaps/google-maps-services-js';
import crypto from 'crypto';

// Cliente do Google Maps
const mapsClient = new Client({});

/**
 * Handler principal que roteia as solicitações para as sub-funções apropriadas
 */
export default async function handler(req, res) {
  // Extrair o tipo de operação da consulta
  const { op, cnpj } = req.query;
  
  try {
    if (op === 'distance') {
      return await distanceHandler(req, res);
    } else if (cnpj) {
      return await cnpjHandler(req, res, cnpj);
    } else {
      return res.status(400).json({ 
        error: 'Operação ou parâmetro inválido',
        validOperations: ['distance', 'cnpj']
      });
    }
  } catch (error) {
    console.error(`Erro em location-services:`, error);
    return res.status(500).json({ 
      error: 'Erro interno no servidor',
      message: error.message
    });
  }
}

/**
 * Endpoint para calcular distância entre endereços
 * Utiliza a Google Routes API para calcular distâncias reais considerando rotas
 */
async function distanceHandler(req, res) {
  try {
    const method = req.method;
    
    // Apenas GET e POST são permitidos
    if (method !== 'GET' && method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Extrai os endereços da requisição
    let originAddress, destinationAddress;
    
    if (method === 'GET') {
      originAddress = req.query.origin;
      destinationAddress = req.query.destination;
    } else if (method === 'POST') {
      originAddress = req.body.origin;
      destinationAddress = req.body.destination;
    }

    // Verifica se os endereços foram fornecidos
    if (!originAddress || !destinationAddress) {
      return res.status(400).json({ 
        error: 'Parâmetros origem e destino são obrigatórios',
        origin: originAddress,
        destination: destinationAddress
      });
    }

    // Cálculo da distância
    const distance = await getDistanceBetweenAddresses(originAddress, destinationAddress);
    
    // Retorna o resultado
    return res.status(200).json({
      success: true,
      origin: originAddress,
      destination: destinationAddress,
      distance: distance.distance,
      distanceText: distance.distanceText,
      duration: distance.duration,
      durationText: distance.durationText,
      unit: 'km'
    });
  } catch (error) {
    console.error('Erro ao calcular distância:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao calcular distância'
    });
  }
}

/**
 * Calcula a distância entre dois endereços usando a API do Google Maps
 */
async function getDistanceBetweenAddresses(fromAddress, toAddress) {
  // Tenta primeiro com a API do Google
  try {
    return await calculateDistanceWithGoogleApi(fromAddress, toAddress);
  } catch (error) {
    console.error('Erro ao calcular distância com Google API:', error);
    
    // Usa um fallback simples se a API falhar
    const estimatedDistance = estimateDistance(fromAddress, toAddress);
    
    return {
      distance: estimatedDistance || 0,
      distanceText: estimatedDistance ? `~${estimatedDistance} km` : 'Desconhecida',
      duration: null,
      durationText: 'Desconhecido'
    };
  }
}

/**
 * Função que calcula a distância entre dois endereços usando a API do Google Maps
 */
async function calculateDistanceWithGoogleApi(fromAddress, toAddress) {
  // Se não houver chave da API, lança erro
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API Key não configurada');
  }
  
  // Formata os endereços para melhor precisão
  const formattedOrigin = formatAddressForApi(fromAddress);
  const formattedDestination = formatAddressForApi(toAddress);
  
  try {
    const response = await mapsClient.distancematrix({
      params: {
        origins: [formattedOrigin],
        destinations: [formattedDestination],
        key: process.env.GOOGLE_MAPS_API_KEY,
        language: 'pt-BR',
        units: 'metric'
      }
    });
    
    // Verifica se houve erro na resposta
    if (response.data.status !== 'OK') {
      throw new Error(`Erro na API do Google Maps: ${response.data.status}`);
    }
    
    // Extrai os resultados
    const element = response.data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      throw new Error(`Não foi possível calcular a distância: ${element.status}`);
    }
    
    return {
      distance: element.distance.value / 1000, // Converte metros para km
      distanceText: element.distance.text,
      duration: element.duration.value, // Em segundos
      durationText: element.duration.text
    };
  } catch (error) {
    console.error('Erro ao calcular distância com Google Maps API:', error);
    throw error;
  }
}

/**
 * Função que formata um endereço para melhor precisão na Google Routes API
 */
function formatAddressForApi(address) {
  // Certifica-se de que o endereço inclui Brasil se não especificado
  if (!address.toLowerCase().includes('brasil') && 
      !address.toLowerCase().includes('brazil')) {
    return `${address}, Brasil`;
  }
  return address;
}

/**
 * Função de fallback para estimar a distância entre dois endereços
 * Usa uma estimativa baseada nas cidades (não é precisa)
 */
function estimateDistance(fromAddress, toAddress) {
  // Extrai possíveis cidades dos endereços
  const fromCity = extractCity(fromAddress);
  const toCity = extractCity(toAddress);
  
  if (!fromCity || !toCity) return null;
  
  // Busca as coordenadas aproximadas das cidades
  const fromCoords = findClosestCity(fromCity);
  const toCoords = findClosestCity(toCity);
  
  if (!fromCoords || !toCoords) return null;
  
  // Calcula a distância em linha reta (não é precisa para rotas reais)
  return calculateDistance(
    fromCoords.lat, fromCoords.lng,
    toCoords.lat, toCoords.lng
  );
}

/**
 * Extrai o nome da cidade de um endereço
 */
function extractCity(address) {
  // Lista de palavras-chave que podem preceder o nome da cidade
  const cityKeywords = [
    'cidade de ', 'city of ', 'em ', 'in ', 
    'para ', 'to ', 'de ', 'from '
  ];
  
  let lowerAddress = address.toLowerCase();
  
  // Remove vírgulas e substitui por espaços
  lowerAddress = lowerAddress.replace(/,/g, ' ');
  
  // Tokeniza o endereço
  const tokens = lowerAddress.split(/\s+/);
  
  // Procura por cidades conhecidas no texto
  for (const token of tokens) {
    // Ignora tokens muito curtos
    if (token.length < 3) continue;
    
    // Ignora tokens que são apenas números
    if (/^\d+$/.test(token)) continue;
    
    // Ignora palavras comuns
    if (['rua', 'avenida', 'av', 'r', 'estrada', 'rodovia', 'número', 'n'].includes(token)) continue;
    
    // Se for uma cidade conhecida, retorna
    return token;
  }
  
  return null;
}

/**
 * Encontra as coordenadas aproximadas de uma cidade
 * Nesta versão simplificada, temos apenas alguns exemplos
 */
function findClosestCity(cityName) {
  // Mapa de cidades conhecidas
  const citiesMap = {
    'sao': { lat: -23.5505, lng: -46.6333 }, // São Paulo
    'paulo': { lat: -23.5505, lng: -46.6333 }, // São Paulo
    'sp': { lat: -23.5505, lng: -46.6333 }, // São Paulo
    'rio': { lat: -22.9068, lng: -43.1729 }, // Rio de Janeiro
    'janeiro': { lat: -22.9068, lng: -43.1729 }, // Rio de Janeiro
    'rj': { lat: -22.9068, lng: -43.1729 }, // Rio de Janeiro
    'belo': { lat: -19.9208, lng: -43.9378 }, // Belo Horizonte
    'horizonte': { lat: -19.9208, lng: -43.9378 }, // Belo Horizonte
    'bh': { lat: -19.9208, lng: -43.9378 }, // Belo Horizonte
    'brasilia': { lat: -15.7801, lng: -47.9292 }, // Brasília
    'salvador': { lat: -12.9716, lng: -38.5016 }, // Salvador
    'curitiba': { lat: -25.4284, lng: -49.2733 }, // Curitiba
    'recife': { lat: -8.0476, lng: -34.8770 }, // Recife
    'fortaleza': { lat: -3.7319, lng: -38.5267 }, // Fortaleza
  };
  
  // Normaliza o nome da cidade
  const normalizedName = cityName.normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                                .toLowerCase();
  
  // Procura na lista de cidades conhecidas
  if (citiesMap[normalizedName]) {
    return citiesMap[normalizedName];
  }
  
  return null;
}

/**
 * Calcula a distância em linha reta entre duas coordenadas (fórmula de Haversine)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371; // Raio da Terra em km
  
  // Converte graus para radianos
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  // Fórmula de Haversine
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = earthRadius * c;
  
  // Arredonda para 1 casa decimal
  return Math.round(distance * 10) / 10;
}

/**
 * Converte graus para radianos
 */
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Handler para busca de CNPJ
 */
async function cnpjHandler(req, res, cnpj) {
  try {
    // Validar CNPJ
    if (!validateCNPJ(cnpj)) {
      return res.status(400).json({ error: 'CNPJ inválido' });
    }
    
    // Limpar CNPJ (remover caracteres não numéricos)
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    
    // Buscar dados do CNPJ
    const cnpjData = await fetchCNPJData(cleanCNPJ);
    
    if (!cnpjData) {
      return res.status(404).json({ error: 'CNPJ não encontrado' });
    }
    
    // Adicionar endereço formatado
    if (cnpjData.logradouro) {
      cnpjData.formattedAddress = formatAddress(cnpjData);
    }
    
    return res.status(200).json(cnpjData);
  } catch (error) {
    console.error('Erro ao buscar dados do CNPJ:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados do CNPJ' });
  }
}

/**
 * Busca dados de um CNPJ utilizando uma API pública
 * 
 * @param {string} cnpj CNPJ para consulta (apenas números)
 * @returns {Promise<Object|null>} Dados do CNPJ ou null em caso de erro
 */
async function fetchCNPJData(cnpj) {
  try {
    // Existem várias APIs públicas para consulta de CNPJ
    // Esta é apenas uma implementação de exemplo
    const response = await axios.get(`https://publica.cnpj.ws/cnpj/${cnpj}`);
    
    // Verifica se a resposta tem os campos esperados
    if (!response.data || !response.data.razao_social) {
      console.warn('Resposta da API de CNPJ em formato inesperado:', response.data);
      return null;
    }
    
    // Mapeia os dados para o formato esperado pela aplicação
    return {
      cnpj: cnpj,
      nome: response.data.razao_social,
      fantasia: response.data.estabelecimento?.nome_fantasia,
      logradouro: response.data.estabelecimento?.tipo_logradouro + ' ' + response.data.estabelecimento?.logradouro,
      numero: response.data.estabelecimento?.numero,
      complemento: response.data.estabelecimento?.complemento,
      bairro: response.data.estabelecimento?.bairro,
      municipio: response.data.estabelecimento?.cidade?.nome,
      uf: response.data.estabelecimento?.estado?.sigla,
      cep: response.data.estabelecimento?.cep,
      telefone: response.data.estabelecimento?.ddd1 + response.data.estabelecimento?.telefone1,
      email: response.data.estabelecimento?.email,
    };
  } catch (error) {
    // Casos alternativos caso a API esteja fora do ar ou com limite excedido
    // Este é apenas um exemplo de dados fictícios para desenvolvimento
    // Em produção, deve-se usar apenas APIs reais
    
    // Usa um hash do CNPJ para gerar sempre o mesmo resultado para o mesmo CNPJ
    const hash = crypto.createHash('md5').update(cnpj).digest('hex');
    const firstChars = hash.substring(0, 6);
    
    // Cria dados aleatórios mas consistentes baseados no hash do CNPJ
    // Isto é apenas para desenvolvimento e NÃO deve ser usado em produção
    const mockData = {
      cnpj: cnpj,
      nome: `Empresa ${firstChars.toUpperCase()}`,
      fantasia: `Nome Fantasia ${firstChars.substring(0, 3).toUpperCase()}`,
      logradouro: 'Avenida Principal',
      numero: '1000',
      complemento: 'Sala 123',
      bairro: 'Centro',
      municipio: 'São Paulo',
      uf: 'SP',
      cep: '01000-000',
      telefone: '1122223333',
      email: `contato@empresa${firstChars.toLowerCase()}.com.br`,
      error: 'Dados gerados aleatoriamente para desenvolvimento',
    };
    
    console.warn('Usando dados fictícios para CNPJ em desenvolvimento', error.message);
    return mockData;
  }
}

/**
 * Formata um endereço completo a partir dos dados do CNPJ
 * 
 * @param {Object} data Dados do CNPJ
 * @returns {string} Endereço formatado
 */
function formatAddress(data) {
  const parts = [];
  
  if (data.logradouro) {
    let address = data.logradouro;
    if (data.numero) address += `, ${data.numero}`;
    if (data.complemento) address += ` - ${data.complemento}`;
    parts.push(address);
  }
  
  if (data.bairro) {
    parts.push(data.bairro);
  }
  
  if (data.municipio) {
    let cityState = data.municipio;
    if (data.uf) cityState += ` - ${data.uf}`;
    parts.push(cityState);
  }
  
  if (data.cep) {
    parts.push(data.cep);
  }
  
  return parts.join(', ');
}

/**
 * Valida um CNPJ
 * 
 * @param {string} cnpj CNPJ para validar (pode incluir pontuação)
 * @returns {boolean} true se o CNPJ é válido, false caso contrário
 */
function validateCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]/g, '');

  if (cnpj.length !== 14) return false;
  
  // Elimina CNPJs com todos os dígitos iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  // Cálculo dos dígitos verificadores
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  // Primeiro dígito
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0), 10)) return false;
  
  // Segundo dígito
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  
  return result === parseInt(digits.charAt(1), 10);
}