import { log } from '../vite';
import axios from 'axios';

// Coordenadas aproximadas de algumas cidades brasileiras (para fallback)
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  'sao paulo': { lat: -23.5505, lng: -46.6333 },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'belo horizonte': { lat: -19.9167, lng: -43.9345 },
  'brasilia': { lat: -15.7801, lng: -47.9292 },
  'salvador': { lat: -12.9714, lng: -38.5014 },
  'fortaleza': { lat: -3.7319, lng: -38.5267 },
  'recife': { lat: -8.0476, lng: -34.8770 },
  'porto alegre': { lat: -30.0346, lng: -51.2177 },
  'curitiba': { lat: -25.4290, lng: -49.2671 },
  'manaus': { lat: -3.1190, lng: -60.0217 },
  'belem': { lat: -1.4558, lng: -48.4902 },
  'goiania': { lat: -16.6864, lng: -49.2643 },
  'guarulhos': { lat: -23.4543, lng: -46.5337 },
  'campinas': { lat: -22.9056, lng: -47.0608 },
  'natal': { lat: -5.7793, lng: -35.2009 },
  'santos': { lat: -23.9619, lng: -46.3342 },
  'campo grande': { lat: -20.4695, lng: -54.6201 },
  'maceio': { lat: -9.6498, lng: -35.7089 },
  'cuiaba': { lat: -15.5989, lng: -56.0949 },
  'florianopolis': { lat: -27.5969, lng: -48.5495 }
};

// Fórmula Haversine para calcular distância entre coordenadas em km (para fallback)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distância em km
  
  return parseFloat(distance.toFixed(2));
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

// Encontra a cidade mais próxima com base no nome (para fallback)
function findClosestCity(cityName: string): { lat: number; lng: number } | null {
  const normalizedName = cityName.toLowerCase().trim();
  
  // Tenta encontrar correspondência exata
  if (cityCoordinates[normalizedName]) {
    return cityCoordinates[normalizedName];
  }
  
  // Tenta encontrar correspondência parcial
  for (const [name, coords] of Object.entries(cityCoordinates)) {
    if (normalizedName.includes(name) || name.includes(normalizedName)) {
      return coords;
    }
  }
  
  // Tenta verificar se alguma palavra do endereço coincide com uma cidade
  const words = normalizedName.split(/[\s,.-]+/);
  for (const word of words) {
    if (word.length > 3) { // Ignorar palavras muito curtas
      for (const [name, coords] of Object.entries(cityCoordinates)) {
        if (name.includes(word)) {
          return coords;
        }
      }
    }
  }
  
  return null;
}

// Analisa endereço para tentar extrair cidade (para fallback)
function extractCity(address: string): string {
  // Remover CEP, números e outros elementos comuns em endereços
  const cleanedAddress = address
    .replace(/\d{5}-?\d{3}/g, '') // Remove CEP
    .replace(/,?\s*n[º°]?\s*\d+/gi, '') // Remove números de casa/prédio
    .replace(/\d+/g, '') // Remove outros números
    .replace(/apto|apartamento|casa|bloco|sala|conjunto/gi, '') // Remove termos comuns
    .trim();
  
  // Divide o endereço em partes
  const parts = cleanedAddress.split(/,|\.|\-/);
  
  // Tenta identificar a parte que mais parece ser uma cidade
  // (geralmente é a última parte antes do estado ou a primeira mais longa)
  if (parts.length > 1) {
    const possibleCity = parts[parts.length - 2].trim();
    if (possibleCity.length > 3) {
      return possibleCity;
    }
  }
  
  // Se não conseguir identificar, retorna o endereço limpo
  return cleanedAddress;
}

// Método antigo (fallback) para estimar a distância entre dois endereços
function fallbackEstimateDistance(fromAddress: string, toAddress: string): number | null {
  try {
    const fromCity = extractCity(fromAddress);
    const toCity = extractCity(toAddress);
    
    log(`Fallback: Tentando calcular distância de "${fromCity}" para "${toCity}"`, 'distance-service');
    
    const fromCoordinates = findClosestCity(fromCity);
    const toCoordinates = findClosestCity(toCity);
    
    if (!fromCoordinates || !toCoordinates) {
      log(`Fallback: Não foi possível encontrar coordenadas para um dos endereços`, 'distance-service');
      return null;
    }
    
    const distance = calculateDistance(
      fromCoordinates.lat, fromCoordinates.lng,
      toCoordinates.lat, toCoordinates.lng
    );
    
    log(`Fallback: Distância estimada: ${distance} km`, 'distance-service');
    
    return distance;
  } catch (error) {
    log(`Fallback: Erro ao calcular distância: ${error}`, 'distance-service');
    return null;
  }
}

/**
 * Função que formata um endereço para melhor precisão na Google Routes API
 */
function formatAddressForApi(address: string): string {
  // Se o endereço já contém o Brasil, retorna como está
  if (address.toLowerCase().includes('brasil')) {
    return address;
  }
  
  // Caso contrário, adiciona Brasil ao final
  return `${address}, Brasil`;
}

// Função principal usando Google Routes API para cálculo de distância
export async function calculateDistanceWithGoogleApi(
  originAddress: string, 
  destinationAddress: string
): Promise<{
  distanceMeters?: number,
  distanceKm?: number,
  durationSeconds?: number,
  durationText?: string,
  success: boolean,
  error?: string
}> {
  try {
    // Verifica se a API key do Google Maps está configurada
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      log('API key do Google Maps não configurada!', 'distance-service');
      return { 
        success: false,
        error: 'API key não configurada' 
      };
    }
    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    
    // Formata os endereços para melhor precisão
    const origin = formatAddressForApi(originAddress);
    const destination = formatAddressForApi(destinationAddress);
    
    log(`Calculando distância via Google Routes API: de '${origin}' para '${destination}'`, 'distance-service');
    
    const response = await axios.post(
      url,
      {
        origin: {
          address: origin
        },
        destination: {
          address: destination
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false
        },
        languageCode: 'pt-BR',
        units: 'METRIC'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline,routes.legs'
        }
      }
    );
    
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const distanceMeters = route.distanceMeters;
      const durationSeconds = route.duration ? 
        parseInt(route.duration.replace('s', '')) : 
        undefined;
      
      // Extrai informações adicionais da rota
      let durationText;
      if (durationSeconds) {
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        durationText = hours > 0 ? 
          `${hours}h ${minutes}min` : 
          `${minutes} minutos`;
      }
      
      log(`Distância calculada com sucesso via Google Routes API: ${distanceMeters/1000} km, ${durationText}`, 'distance-service');
      
      return {
        success: true,
        distanceMeters,
        distanceKm: distanceMeters ? Math.round(distanceMeters / 1000 * 10) / 10 : undefined,
        durationSeconds,
        durationText
      };
    } else {
      log('Resposta da API não contém dados de rota válidos', 'distance-service');
      return {
        success: false,
        error: 'Não foi possível calcular a rota entre os endereços fornecidos'
      };
    }
  } catch (error: any) {
    log(`Erro ao calcular distância via Google Routes API: ${error.message}`, 'distance-service');
    
    if (error.response) {
      log(`Status de erro: ${error.response.status}`, 'distance-service');
      log(`Detalhes da resposta: ${JSON.stringify(error.response.data)}`, 'distance-service');
    }
    
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao calcular distância'
    };
  }
}

// API endpoint para calcular distância (versão antiga - mantida para compatibilidade)
export function estimateDistance(fromAddress: string, toAddress: string): number | null {
  return fallbackEstimateDistance(fromAddress, toAddress);
}

// API endpoint para calcular distância
export async function getDistanceBetweenAddresses(fromAddress: string, toAddress: string): Promise<{
  success: boolean;
  distance?: number;
  distanceText?: string;
  duration?: number;
  durationText?: string;
  unit?: string;
  error?: string;
}> {
  try {
    // Verificar explicitamente se temos o Google Maps API Key
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!googleMapsApiKey) {
      log('API key do Google Maps não encontrada no ambiente. Verifique a configuração.', 'distance-service');
      return {
        success: false,
        error: "Configuração da API Google Maps não encontrada. Entre em contato com o administrador."
      };
    }
    
    // Usar a Google Routes API, já que a API key está configurada
    log(`Calculando distância via Google API: origem="${fromAddress}", destino="${toAddress}"`, 'distance-service');
    
    // Melhorar a formatação dos endereços para a API
    const formattedOrigin = formatAddressForApi(fromAddress);
    const formattedDestination = formatAddressForApi(toAddress);
    
    log(`Endereços formatados: origem="${formattedOrigin}", destino="${formattedDestination}"`, 'distance-service');
    
    const googleResult = await calculateDistanceWithGoogleApi(formattedOrigin, formattedDestination);
    
    if (googleResult.success) {
      log(`Sucesso na API Google: distância=${googleResult.distanceKm} km, duração=${googleResult.durationText}`, 'distance-service');
      return {
        success: true,
        distance: googleResult.distanceKm,
        distanceText: googleResult.distanceKm ? `${googleResult.distanceKm} km` : undefined,
        duration: googleResult.durationSeconds ? googleResult.durationSeconds / 60 : undefined, // minutos
        durationText: googleResult.durationText,
        unit: "km"
      };
    } else {
      log(`Falha na API do Google: ${googleResult.error}`, 'distance-service');
      
      // Em caso de falha, devolve o erro específico da API do Google
      return {
        success: false,
        error: googleResult.error || "Não foi possível calcular a distância com a API do Google."
      };
    }
    
    // NOTA: Estamos removendo o fallback para garantir a precisão dos dados
  } catch (error: any) {
    log(`Erro no serviço de distância: ${error.message}`, 'distance-service');
    return {
      success: false,
      error: "Erro ao processar a solicitação de cálculo de distância."
    };
  }
}