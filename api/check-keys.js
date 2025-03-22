/**
 * API endpoint para verificar quais chaves de API estão disponíveis
 * Não mostra os valores reais das chaves, apenas se estão configuradas
 */
export default async function handler(req, res) {
  // Lista de todas as chaves que queremos verificar
  const keysToCheck = [
    'GOOGLE_MAPS_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ];
  
  // Objeto que conterá o status de cada chave
  const keyStatus = {};
  
  // Verificar cada chave
  keysToCheck.forEach(key => {
    // Verificamos apenas se a chave existe e não está vazia
    // NÃO MOSTRAR OS VALORES REAIS DAS CHAVES
    const value = process.env[key];
    keyStatus[key] = {
      configured: !!value,
      masked: value ? '********' : null
    };
  });
  
  // Retornar o status das chaves
  res.status(200).json({
    message: 'Status das chaves de API',
    keyStatus
  });
}