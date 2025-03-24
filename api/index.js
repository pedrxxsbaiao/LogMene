// Serverless entry point para Vercel
import express from 'express';
import cors from 'cors';
import path from 'path';

// Importações dos handlers de API
import authHandler from './auth.js';
import dbHandler from './db.js';
import freightRequestsHandler from './freight-requests.js';
import quotesHandler from './quotes.js';
import deliveryProofsHandler from './delivery-proofs.js';
import notificationsHandler from './notifications.js';
import emailServiceHandler from './email-service.js';
import smsServiceHandler from './sms-service.js';

const app = express();

// Middlewares básicos
app.use(express.json({ limit: '10mb' })); // Aumentar limite para uploads de imagens
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://logmene.com.br', 'https://logmene.vercel.app'] 
    : 'http://localhost:5000',
  credentials: true
}));

// Configurar rotas da API
app.use('/api/auth', authHandler);
app.use('/api/db', dbHandler);
app.use('/api/freight-requests', freightRequestsHandler);
app.use('/api/quotes', quotesHandler);
app.use('/api/delivery-proofs', deliveryProofsHandler);
app.use('/api/notifications', notificationsHandler);
app.use('/api/email', emailServiceHandler);
app.use('/api/sms', smsServiceHandler);

// Rotas adicionais específicas
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Em produção, servir arquivos estáticos
if (process.env.NODE_ENV === 'production') {
  // Arquivos estáticos (dist)
  app.use(express.static('dist', { maxAge: '1y' }));
  
  // Todas as outras rotas apontam para o index.html para client-side routing
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API não encontrada' });
    }
    
    res.sendFile(path.resolve('dist/index.html'));
  });
}

// Handler de erros global
app.use((err, req, res, next) => {
  console.error('Erro na aplicação:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Para desenvolvimento local (não necessário na Vercel)
if (process.env.NODE_ENV !== 'production' && typeof process !== 'undefined') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
  });
}

// Exportar a aplicação para Vercel
export default app;