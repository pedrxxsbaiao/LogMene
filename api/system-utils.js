// Arquivo que consolida os endpoints de utilitários do sistema
// Isso reduz o número de funções serverless na Vercel

/**
 * Handler principal que roteia as solicitações para as sub-funções apropriadas
 */
export default async function handler(req, res) {
  // Extrair o tipo de operação da consulta
  const { op } = req.query;
  
  try {
    switch (op) {
      case 'env':
        return await checkEnvHandler(req, res);
      case 'keys':
        return await checkKeysHandler(req, res);
      default:
        return res.status(400).json({ 
          error: 'Operação inválida',
          validOperations: ['env', 'keys']
        });
    }
  } catch (error) {
    console.error(`Erro em system-utils/${op}:`, error);
    return res.status(500).json({ 
      error: 'Erro interno no servidor',
      message: error.message
    });
  }
}

/**
 * Verifica as variáveis de ambiente críticas para o funcionamento do sistema
 */
async function checkEnvHandler(req, res) {
  // Verificar se a requisição tem a permissão para acessar informações sensíveis
  // Em um ambiente real, seria necessário verificar algum tipo de autenticação
  // Para fins de demonstração, vamos permitir o acesso
  
  try {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    const isVercel = !!process.env.VERCEL;
    const vercelEnv = process.env.VERCEL_ENV;
    
    // Verificar as variáveis de ambiente críticas
    const missingCriticalKeys = [];
    
    // Verificar variáveis críticas
    if (!process.env.DATABASE_URL) {
      missingCriticalKeys.push('DATABASE_URL');
    }
    
    // Verificar se o banco de dados está configurado
    let databaseStatus = {
      isConfigured: !!process.env.DATABASE_URL,
    };
    
    if (process.env.DATABASE_URL) {
      // Extrair informações do banco de dados da URL
      try {
        const url = new URL(process.env.DATABASE_URL);
        databaseStatus = {
          ...databaseStatus,
          type: url.protocol.replace(':', ''),
          host: url.hostname,
        };
      } catch (e) {
        console.error('Erro ao analisar DATABASE_URL:', e);
      }
    }
    
    // Verificar serviços opcionais configurados
    const configuredOptionalServices = [];
    
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      configuredOptionalServices.push('twilio');
    }
    
    if (process.env.GOOGLE_MAPS_API_KEY) {
      configuredOptionalServices.push('google_maps');
    }
    
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
      configuredOptionalServices.push('gmail');
    }
    
    // Informações sobre a requisição
    const requestInfo = {
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      host: req.headers.host,
    };
    
    return res.status(200).json({
      status: missingCriticalKeys.length === 0 ? 'ok' : 'missing_critical_keys',
      environment: {
        nodeEnv,
        isProduction,
        isVercel,
        vercelEnv,
        timestamp: new Date().toISOString(),
      },
      database: databaseStatus,
      missingCriticalKeys: missingCriticalKeys.length > 0 ? missingCriticalKeys : undefined,
      configuredOptionalServices,
      requestInfo,
    });
  } catch (error) {
    console.error('Erro ao verificar ambiente:', error);
    return res.status(500).json({ 
      error: 'Erro ao verificar ambiente',
      message: error.message
    });
  }
}

/**
 * Verifica quais chaves de API estão disponíveis
 */
async function checkKeysHandler(req, res) {
  // Verificar se a requisição tem a permissão para acessar informações sensíveis
  // Em um ambiente real, seria necessário verificar algum tipo de autenticação
  // Para fins de demonstração, vamos permitir o acesso
  
  try {
    // Verificar as chaves de API configuradas
    const keyStatus = {
      // Twillio
      TWILIO_ACCOUNT_SID: {
        configured: !!process.env.TWILIO_ACCOUNT_SID,
        masked: process.env.TWILIO_ACCOUNT_SID ? maskKey(process.env.TWILIO_ACCOUNT_SID) : null,
      },
      TWILIO_AUTH_TOKEN: {
        configured: !!process.env.TWILIO_AUTH_TOKEN,
        masked: process.env.TWILIO_AUTH_TOKEN ? maskKey(process.env.TWILIO_AUTH_TOKEN) : null,
      },
      TWILIO_PHONE_NUMBER: {
        configured: !!process.env.TWILIO_PHONE_NUMBER,
        masked: process.env.TWILIO_PHONE_NUMBER ? maskKey(process.env.TWILIO_PHONE_NUMBER) : null,
      },
      
      // Google Maps
      GOOGLE_MAPS_API_KEY: {
        configured: !!process.env.GOOGLE_MAPS_API_KEY,
        masked: process.env.GOOGLE_MAPS_API_KEY ? maskKey(process.env.GOOGLE_MAPS_API_KEY) : null,
      },
      
      // Gmail OAuth2
      GOOGLE_CLIENT_ID: {
        configured: !!process.env.GOOGLE_CLIENT_ID,
        masked: process.env.GOOGLE_CLIENT_ID ? maskKey(process.env.GOOGLE_CLIENT_ID) : null,
      },
      GOOGLE_CLIENT_SECRET: {
        configured: !!process.env.GOOGLE_CLIENT_SECRET,
        masked: process.env.GOOGLE_CLIENT_SECRET ? maskKey(process.env.GOOGLE_CLIENT_SECRET) : null,
      },
      GOOGLE_REFRESH_TOKEN: {
        configured: !!process.env.GOOGLE_REFRESH_TOKEN,
        masked: process.env.GOOGLE_REFRESH_TOKEN ? maskKey(process.env.GOOGLE_REFRESH_TOKEN) : null,
      },
    };
    
    return res.status(200).json({
      keyStatus,
    });
  } catch (error) {
    console.error('Erro ao verificar chaves de API:', error);
    return res.status(500).json({ 
      error: 'Erro ao verificar chaves de API',
      message: error.message
    });
  }
}

/**
 * Função auxiliar para mascarar chaves sensíveis
 */
function maskKey(key) {
  if (!key || key.length < 8) {
    return '****';
  }
  
  // Mostrar os primeiros 4 e os últimos 4 caracteres
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}