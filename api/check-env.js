// Função para verificar o ambiente e variáveis de configuração no deploy
export default async function handler(req, res) {
  // Lista de chaves de ambiente críticas
  const criticalKeys = ['DATABASE_URL', 'NODE_ENV'];
  const missingCritical = criticalKeys.filter(key => !process.env[key]);
  
  // Lista de chaves de ambiente opcionais
  const optionalKeys = [
    'GOOGLE_MAPS_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ];
  
  // Variáveis que estão configuradas
  const configuredOptional = optionalKeys.filter(key => process.env[key]);
  
  // Status geral da aplicação
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = !!process.env.VERCEL;
  const vercelEnv = process.env.VERCEL_ENV || 'unknown';
  
  // Informações de banco de dados (sem mostrar a URL completa por segurança)
  let dbInfo = {};
  if (process.env.DATABASE_URL) {
    const dbUrlParts = process.env.DATABASE_URL.split('@');
    if (dbUrlParts.length > 1) {
      const hostPart = dbUrlParts[1].split('/')[0];
      dbInfo = {
        isConfigured: true,
        host: hostPart,
        type: process.env.DATABASE_URL.startsWith('postgres') ? 'PostgreSQL' : 'Unknown'
      };
    } else {
      dbInfo = { isConfigured: true, type: 'Format unknown' };
    }
  } else {
    dbInfo = { isConfigured: false };
  }
  
  // Prepare uma resposta segura (sem expor valores de chaves)
  const response = {
    status: missingCritical.length === 0 ? 'ok' : 'error',
    environment: {
      nodeEnv: process.env.NODE_ENV || 'not set',
      isProduction,
      isVercel,
      vercelEnv,
      timestamp: new Date().toISOString()
    },
    database: dbInfo,
    auth: {
      jwtConfigured: !!process.env.JWT_SECRET
    },
    missingCriticalKeys: missingCritical,
    configuredOptionalServices: configuredOptional,
    requestInfo: {
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      host: req.headers.host
    }
  };
  
  // Código de status: 200 se tudo ok, 500 se faltam chaves críticas
  res.status(missingCritical.length === 0 ? 200 : 500).json(response);
}