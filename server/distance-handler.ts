import { Request, Response } from 'express';
import { getDistanceBetweenAddresses } from './services/distance-service';

/**
 * Endpoint para calcular distância entre endereços
 * Suporta método GET e POST
 */
export async function distanceHandler(req: Request, res: Response) {
  let origin, destination;
  
  // Obter parâmetros dependendo do método da requisição
  if (req.method === 'GET') {
    origin = req.query.origin as string;
    destination = req.query.destination as string;
  } else if (req.method === 'POST') {
    origin = req.body.origin;
    destination = req.body.destination;
  } else {
    return res.status(405).json({ 
      success: false, 
      message: 'Método não permitido' 
    });
  }

  try {
    if (!origin || !destination) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parâmetros obrigatórios: origin, destination' 
      });
    }
    
    console.log(`Calculando distância de "${origin}" para "${destination}"`);
    
    const result = await getDistanceBetweenAddresses(origin, destination);
    
    console.log(`Resultado do cálculo:`, result);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao calcular distância:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao calcular distância',
      error: error.message || String(error)
    });
  }
}