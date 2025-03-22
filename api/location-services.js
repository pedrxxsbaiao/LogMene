// Arquivo que consolida os endpoints relacionados a serviços de localização e CNPJ
// Isso reduz o número de funções serverless na Vercel

// Dependências
import { Client } from '@googlemaps/google-maps-services-js';
import axios from 'axios';

/**
 * Handler principal que roteia as solicitações para as sub-funções apropriadas
 */
export default async function handler(req, res) {
  // Extrair o tipo de operação da consulta
  const { op, cnpj } = req.query;
  
  try {
    // Se tiver um cnpj na query, processar como consulta de CNPJ
    if (cnpj) {
      return await cnpjHandler(req, res, cnpj);
    }
    
    // Caso contrário, processar com base na operação
    switch (op) {
      case 'distance':
        return await distanceHandler(req, res);
      case 'cnpj':
        // Pegaria o CNPJ do corpo da requisição
        return res.status(400).json({ error: 'CNPJ não informado. Use ?cnpj=NUMERO' });
      default:
        return res.status(400).json({ 
          error: 'Operação inválida',
          validOperations: ['distance', 'cnpj']
        });
    }
  } catch (error) {
    console.error(`Erro em location-services/${op || 'cnpj'}:`, error);
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
  const method = req.method;
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  const { origin, destination } = req.body;
  
  if (!origin || !destination) {
    return res.status(400).json({
      success: false,
      error: 'Endereços de origem e destino são obrigatórios'
    });
  }
  
  try {
    const result = await getDistanceBetweenAddresses(origin, destination);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao calcular distância:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao calcular distância',
      message: error.message
    });
  }
}

/**
 * Calcula a distância entre dois endereços usando a API do Google Maps
 */
async function getDistanceBetweenAddresses(fromAddress, toAddress) {
  try {
    // Tentar primeiro usar a API do Google para cálculo mais preciso
    const result = await calculateDistanceWithGoogleApi(fromAddress, toAddress);
    
    return {
      success: true,
      distance: result.distanceValue / 1000, // Converter para km
      distanceText: result.distanceText,
      duration: result.durationValue / 60, // Converter para minutos
      durationText: result.durationText,
      unit: 'km'
    };
  } catch (error) {
    console.error('Erro ao calcular distância com Google API:', error);
    
    // Fallback para cálculo estimado
    const estimatedDistance = estimateDistance(fromAddress, toAddress);
    
    if (estimatedDistance) {
      return {
        success: true,
        distance: estimatedDistance,
        distanceText: `~${estimatedDistance} km`,
        duration: estimatedDistance * 1.2, // Estimativa bruta
        durationText: `~${Math.round(estimatedDistance * 1.2)} minutos`,
        unit: 'km'
      };
    }
    
    return {
      success: false,
      error: 'Não foi possível calcular a distância'
    };
  }
}

/**
 * Função que calcula a distância entre dois endereços usando a API do Google Maps
 */
async function calculateDistanceWithGoogleApi(fromAddress, toAddress) {
  const client = new Client({});
  
  const formattedOrigin = formatAddressForApi(fromAddress);
  const formattedDestination = formatAddressForApi(toAddress);
  
  const response = await client.distancematrix({
    params: {
      origins: [formattedOrigin],
      destinations: [formattedDestination],
      key: process.env.GOOGLE_MAPS_API_KEY
    }
  });
  
  const data = response.data;
  
  if (
    data.status !== 'OK' ||
    !data.rows ||
    !data.rows[0] ||
    !data.rows[0].elements ||
    !data.rows[0].elements[0] ||
    data.rows[0].elements[0].status !== 'OK'
  ) {
    throw new Error('API do Google não retornou resultados válidos');
  }
  
  const element = data.rows[0].elements[0];
  
  return {
    distanceValue: element.distance.value,
    distanceText: element.distance.text,
    durationValue: element.duration.value,
    durationText: element.duration.text
  };
}

/**
 * Função que formata um endereço para melhor precisão na Google Routes API
 */
function formatAddressForApi(address) {
  // Garantir que o endereço tenha "Brasil" no final para melhorar a precisão
  if (!address.toLowerCase().includes('brasil') && !address.toLowerCase().includes('brazil')) {
    address = `${address}, Brasil`;
  }
  return address;
}

/**
 * Função de fallback para estimar a distância entre dois endereços
 * Usa uma estimativa baseada nas cidades (não é precisa)
 */
function estimateDistance(fromAddress, toAddress) {
  const fromCity = extractCity(fromAddress);
  const toCity = extractCity(toAddress);
  
  if (!fromCity || !toCity) {
    return null;
  }
  
  const fromCoords = findClosestCity(fromCity);
  const toCoords = findClosestCity(toCity);
  
  if (!fromCoords || !toCoords) {
    return null;
  }
  
  return calculateDistance(
    fromCoords.lat,
    fromCoords.lng,
    toCoords.lat,
    toCoords.lng
  );
}

/**
 * Extrai o nome da cidade de um endereço
 */
function extractCity(address) {
  // Lista de cidades importantes
  const cities = [
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Fortaleza',
    'Brasília', 'Curitiba', 'Recife', 'Porto Alegre', 'Manaus',
    'Belém', 'Goiânia', 'Guarulhos', 'Campinas', 'São Luís',
    'São Gonçalo', 'Maceió', 'Duque de Caxias', 'Natal', 'Teresina'
  ];
  
  // Procurar por alguma das cidades no endereço
  for (const city of cities) {
    if (address.includes(city)) {
      return city;
    }
  }
  
  return null;
}

/**
 * Encontra as coordenadas aproximadas de uma cidade
 * Nesta versão simplificada, temos apenas alguns exemplos
 */
function findClosestCity(cityName) {
  const cityMap = {
    'São Paulo': { lat: -23.5505, lng: -46.6333 },
    'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
    'Belo Horizonte': { lat: -19.9167, lng: -43.9345 },
    'Salvador': { lat: -12.9711, lng: -38.5108 },
    'Fortaleza': { lat: -3.7172, lng: -38.5433 },
    'Brasília': { lat: -15.7801, lng: -47.9292 },
    'Curitiba': { lat: -25.4297, lng: -49.2719 },
    'Recife': { lat: -8.0476, lng: -34.8770 },
    'Porto Alegre': { lat: -30.0346, lng: -51.2177 },
    'Manaus': { lat: -3.1190, lng: -60.0217 },
    'Belém': { lat: -1.4554, lng: -48.4898 },
    'Goiânia': { lat: -16.6799, lng: -49.2550 },
    'Guarulhos': { lat: -23.4543, lng: -46.5337 },
    'Campinas': { lat: -22.9099, lng: -47.0626 },
    'São Luís': { lat: -2.5391, lng: -44.2829 },
    'São Gonçalo': { lat: -22.8266, lng: -43.0418 },
    'Maceió': { lat: -9.6498, lng: -35.7089 },
    'Duque de Caxias': { lat: -22.7850, lng: -43.3117 },
    'Natal': { lat: -5.7945, lng: -35.2120 },
    'Teresina': { lat: -5.0920, lng: -42.8038 }
  };
  
  return cityMap[cityName] || null;
}

/**
 * Calcula a distância em linha reta entre duas coordenadas (fórmula de Haversine)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const radius = 6371; // Raio da Terra em km
  
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = radius * c;
  
  return Math.round(distance); // Arredonda para km inteiros
}

/**
 * Converte graus para radianos
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Handler para busca de CNPJ
 */
async function cnpjHandler(req, res, cnpj) {
  // Verificar se o CNPJ é válido
  if (!validateCNPJ(cnpj)) {
    return res.status(400).json({
      success: false,
      error: 'CNPJ inválido'
    });
  }
  
  try {
    const data = await fetchCNPJData(cnpj);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'CNPJ não encontrado'
      });
    }
    
    // Adicionar o endereço formatado
    data.formattedAddress = formatAddress(data);
    
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados do CNPJ',
      message: error.message
    });
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
    // Garante que o CNPJ contém apenas números
    cnpj = cnpj.replace(/\D/g, '');
    
    // API pública para consulta de CNPJ
    const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // CNPJ não encontrado
      console.log(`CNPJ ${cnpj} não encontrado`);
      return null;
    }
    
    console.error(`Erro ao buscar CNPJ ${cnpj}:`, error.message);
    throw new Error(`Erro ao consultar CNPJ: ${error.message}`);
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
    parts.push(data.logradouro);
  }
  
  if (data.numero) {
    parts.push(`nº ${data.numero}`);
  }
  
  if (data.complemento) {
    parts.push(data.complemento);
  }
  
  if (data.bairro) {
    parts.push(data.bairro);
  }
  
  if (data.municipio) {
    const localidade = [data.municipio];
    
    if (data.uf) {
      localidade.push(data.uf);
    }
    
    parts.push(localidade.join('/'));
  }
  
  if (data.cep) {
    parts.push(`CEP ${data.cep}`);
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
  // Remove qualquer caracter que não seja número
  cnpj = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  let peso = 2;
  
  for (let i = 11; i >= 0; i--) {
    soma += parseInt(cnpj.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  let dv1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  
  if (parseInt(cnpj.charAt(12)) !== dv1) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  soma = 0;
  peso = 2;
  
  for (let i = 12; i >= 0; i--) {
    soma += parseInt(cnpj.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  let dv2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  
  if (parseInt(cnpj.charAt(13)) !== dv2) {
    return false;
  }
  
  return true;
}