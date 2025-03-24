import { log } from '../vite';
import axios from 'axios';

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

/**
 * Função principal usando Google Routes API para cálculo de distância
 * A Routes API fornece dados mais precisos, considerando trajetos reais nas estradas
 */
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
      
      // Formata o texto de duração para exibição
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

/**
 * Método alternativo usando Distance Matrix API quando a Routes API falhar
 */
export async function calculateDistanceWithMatrixApi(
  originAddress: string, 
  destinationAddress: string
): Promise<{
  distance?: number,
  distanceText?: string,
  duration?: number,
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
    
    // Formata os endereços para melhor precisão
    const origin = formatAddressForApi(originAddress);
    const destination = formatAddressForApi(destinationAddress);
    
    log(`Calculando distância via Distance Matrix API: de '${origin}' para '${destination}'`, 'distance-service');
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&language=pt-BR&key=${apiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && 
        response.data.rows && 
        response.data.rows[0] && 
        response.data.rows[0].elements && 
        response.data.rows[0].elements[0] && 
        response.data.rows[0].elements[0].status === 'OK') {
      
      const element = response.data.rows[0].elements[0];
      
      return {
        success: true,
        distance: element.distance.value / 1000, // converter para km
        distanceText: element.distance.text,
        duration: element.duration.value / 60, // converter para minutos
        durationText: element.duration.text
      };
    } else {
      log(`Distance Matrix API retornou status: ${response.data.status}`, 'distance-service');
      if (response.data.error_message) {
        log(`Mensagem de erro: ${response.data.error_message}`, 'distance-service');
      }
      
      return {
        success: false,
        error: 'Não foi possível calcular a distância entre os endereços fornecidos'
      };
    }
  } catch (error: any) {
    log(`Erro ao calcular distância via Distance Matrix API: ${error.message}`, 'distance-service');
    
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao calcular distância'
    };
  }
}

/**
 * Função principal para calcular distância entre endereços
 * Primeiro tenta usar a Routes API (mais precisa) e, se falhar, tenta a Distance Matrix API como fallback
 */
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
    
    // Melhorar a formatação dos endereços para a API
    const formattedOrigin = formatAddressForApi(fromAddress);
    const formattedDestination = formatAddressForApi(toAddress);
    
    // Primeiro tenta com a Routes API (mais precisa)
    log(`Tentando calcular com Routes API: origem="${formattedOrigin}", destino="${formattedDestination}"`, 'distance-service');
    const routesResult = await calculateDistanceWithGoogleApi(formattedOrigin, formattedDestination);
    
    if (routesResult.success) {
      return {
        success: true,
        distance: routesResult.distanceKm,
        distanceText: routesResult.distanceKm ? `${routesResult.distanceKm} km` : undefined,
        duration: routesResult.durationSeconds ? routesResult.durationSeconds / 60 : undefined, // minutos
        durationText: routesResult.durationText,
        unit: "km"
      };
    }
    
    // Se a Routes API falhar, tenta com a Distance Matrix API
    log('Routes API falhou, tentando com Distance Matrix API...', 'distance-service');
    const matrixResult = await calculateDistanceWithMatrixApi(formattedOrigin, formattedDestination);
    
    if (matrixResult.success) {
      return {
        success: true,
        distance: matrixResult.distance,
        distanceText: matrixResult.distanceText,
        duration: matrixResult.duration,
        durationText: matrixResult.durationText,
        unit: "km"
      };
    }
    
    // Se ambas falharem, retorna o erro
    return {
      success: false,
      error: routesResult.error || matrixResult.error || "Não foi possível calcular a distância entre os endereços."
    };
  } catch (error: any) {
    log(`Erro no serviço de distância: ${error.message}`, 'distance-service');
    return {
      success: false,
      error: "Erro ao processar a solicitação de cálculo de distância."
    };
  }
}