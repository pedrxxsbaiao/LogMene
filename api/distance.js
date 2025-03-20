/**
 * API Endpoint para calcular distâncias entre endereços
 * Utiliza a Google Routes API para calcular distâncias reais considerando rotas
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export default async function handler(req, res) {
  let origin, destination;
  
  // Suportar tanto requisições GET quanto POST
  if (req.method === 'GET') {
    // Para requisições GET, os parâmetros vêm na query
    origin = req.query.origin;
    destination = req.query.destination;
  } else if (req.method === 'POST') {
    // Para requisições POST, os parâmetros vêm no body
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
    
    // Importar o serviço de distância (usando dynamic import)
    const { getDistanceBetweenAddresses } = await import('../server/services/distance-service.js');
    
    const result = await getDistanceBetweenAddresses(origin, destination);
    
    console.log(`Resultado do cálculo:`, result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao calcular distância:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao calcular distância',
      error: error.message || String(error)
    });
  }
}