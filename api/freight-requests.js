// API de solicitações de frete para ambiente Vercel
import { createDb } from './db.js';
import { freightRequests, quotes, deliveryProofs, users, requestStatus } from '../shared/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// Verificar autenticação com JWT
function authenticateUser(req) {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Header de autorização inválido');
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Token extraído:', token);
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'seu_segredo_jwt_aqui'
    );
    
    console.log('Token decodificado:', decoded);
    return decoded.user;
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return null;
  }
}

// Verificar se o usuário tem o papel necessário
function checkUserRole(user, role) {
  console.log('Verificando papel do usuário:', { user, role });
  return user && user.role === role;
}

export default async function handler(req, res) {
  // Verificar autenticação
  const user = authenticateUser(req);
  console.log('Usuário autenticado:', user);
  
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const db = createDb();
  
  // Roteamento baseado no caminho
  const path = req.url.replace('/api/freight-requests', '').split('?')[0];
  console.log('Rota acessada:', path);
  
  // Funções auxiliares para obter dados relacionados
  async function getFreightRequestWithQuote(id) {
    const [request] = await db.select()
      .from(freightRequests)
      .where(eq(freightRequests.id, id))
      .limit(1);
      
    if (!request) return null;
    
    // Obter cotação se existir
    const [quote] = await db.select()
      .from(quotes)
      .where(eq(quotes.requestId, id))
      .limit(1);
    
    // Obter comprovante de entrega se existir
    const [proof] = await db.select()
      .from(deliveryProofs)
      .where(eq(deliveryProofs.requestId, id))
      .limit(1);
    
    // Obter nome do cliente
    let clientName = null;
    if (request.userId) {
      const [client] = await db.select()
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);
      
      if (client) {
        clientName = client.fullName;
      }
    }
    
    return {
      ...request,
      quote: quote || undefined,
      deliveryProof: proof || undefined,
      clientName
    };
  }
  
  // Lidar com diferentes rotas
  switch (path) {
    // Criar nova solicitação de frete
    case '/create':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      // Verificar se é um cliente
      if (!checkUserRole(user, 'client')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      try {
        const requestData = {
          ...req.body,
          userId: user.id,
          status: 'pending',
          createdAt: new Date()
        };
        
        // Inserir solicitação
        const [request] = await db.insert(freightRequests)
          .values(requestData)
          .returning();
          
        return res.status(201).json(request);
      } catch (error) {
        console.error('Erro ao criar solicitação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Obter uma solicitação específica
    case '':
    case '/':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        const { id } = req.query;
        
        if (id) {
          // Obter solicitação específica
          const request = await getFreightRequestWithQuote(Number(id));
          
          if (!request) {
            return res.status(404).json({ error: 'Solicitação não encontrada' });
          }
          
          // Verificar se o usuário tem acesso à solicitação
          if (user.role === 'client' && request.userId !== user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
          }
          
          return res.status(200).json(request);
        } else {
          // Obter todas as solicitações do usuário se for cliente
          if (user.role === 'client') {
            const requests = await db.select()
              .from(freightRequests)
              .where(eq(freightRequests.userId, user.id));
              
            // Adicionar cotações e comprovantes
            const requestsWithQuotes = await Promise.all(
              requests.map(async (req) => await getFreightRequestWithQuote(req.id))
            );
            
            return res.status(200).json(requestsWithQuotes);
          } else {
            // Para empresas, retornar todas as solicitações
            const requests = await db.select().from(freightRequests);
            
            // Adicionar cotações e comprovantes
            const requestsWithQuotes = await Promise.all(
              requests.map(async (req) => await getFreightRequestWithQuote(req.id))
            );
            
            return res.status(200).json(requestsWithQuotes);
          }
        }
      } catch (error) {
        console.error('Erro ao obter solicitações:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Atualizar status da solicitação
    case '/update-status':
      if (req.method !== 'PUT' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        const { id, status } = req.body;
        
        if (!id || !status) {
          return res.status(400).json({ error: 'ID e status são obrigatórios' });
        }
        
        // Verificar se o status é válido
        if (!requestStatus.includes(status)) {
          return res.status(400).json({ error: 'Status inválido' });
        }
        
        // Obter a solicitação atual
        const [currentRequest] = await db.select()
          .from(freightRequests)
          .where(eq(freightRequests.id, id))
          .limit(1);
          
        if (!currentRequest) {
          return res.status(404).json({ error: 'Solicitação não encontrada' });
        }
        
        // Verificar permissões baseadas no papel e no status
        if (user.role === 'client') {
          // Clientes só podem aceitar ou rejeitar cotações
          if (status !== 'accepted' && status !== 'rejected') {
            return res.status(403).json({ error: 'Acesso negado' });
          }
          
          // Verificar se a solicitação pertence ao cliente
          if (currentRequest.userId !== user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
          }
          
          // Verificar se a solicitação está no status correto para ser atualizada
          if (currentRequest.status !== 'quoted') {
            return res.status(400).json({ error: 'A solicitação precisa estar cotada para ser aceita ou rejeitada' });
          }
        } else if (user.role === 'company') {
          // Empresas podem cotar, marcar como completa ou pendente
          if (status === 'accepted' || status === 'rejected') {
            return res.status(403).json({ error: 'Acesso negado' });
          }
          
          // Verificar transições de estado válidas
          if (status === 'completed' && currentRequest.status !== 'accepted') {
            return res.status(400).json({ error: 'A solicitação precisa estar aceita para ser marcada como completa' });
          }
          
          if (status === 'quoted' && currentRequest.status !== 'pending') {
            return res.status(400).json({ error: 'A solicitação precisa estar pendente para ser cotada' });
          }
        }
        
        // Atualizar o status
        const [updatedRequest] = await db.update(freightRequests)
          .set({ status, updatedAt: new Date() })
          .where(eq(freightRequests.id, id))
          .returning();
          
        return res.status(200).json(updatedRequest);
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Obter solicitações pendentes (para empresas)
    case '/pending':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      // Verificar se é uma empresa
      if (!checkUserRole(user, 'company')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      try {
        console.log('Buscando solicitações pendentes...');
        const pendingRequests = await db.select()
          .from(freightRequests)
          .where(eq(freightRequests.status, 'pending'));
          
        console.log(`Encontradas ${pendingRequests.length} solicitações pendentes`);
        
        // Adicionar dados relacionados
        const requestsWithData = await Promise.all(
          pendingRequests.map(async (req) => await getFreightRequestWithQuote(req.id))
        );
        
        console.log('Dados retornados:', JSON.stringify(requestsWithData));
        
        return res.status(200).json(requestsWithData);
      } catch (error) {
        console.error('Erro ao obter solicitações pendentes:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Obter solicitações ativas (para empresas)
    case '/active':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      // Verificar se é uma empresa
      if (!checkUserRole(user, 'company')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      try {
        console.log('Buscando solicitações ativas...');
        const activeRequests = await db.select()
          .from(freightRequests)
          .where(inArray(freightRequests.status, ['quoted', 'accepted']));
          
        console.log(`Número de solicitações ativas encontradas: ${activeRequests.length}`);
        console.log(`Solicitações cotadas: ${activeRequests.filter(req => req.status === 'quoted').length}`);
        console.log(`Solicitações aceitas: ${activeRequests.filter(req => req.status === 'accepted').length}`);
        
        // Adicionar dados relacionados
        const requestsWithData = await Promise.all(
          activeRequests.map(async (req) => await getFreightRequestWithQuote(req.id))
        );
        
        console.log(`Dados retornados para /active: ${JSON.stringify(requestsWithData)}`);
        
        return res.status(200).json(requestsWithData);
      } catch (error) {
        console.error('Erro ao obter solicitações ativas:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Obter solicitações completas (para empresas)
    case '/completed':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      // Verificar se é uma empresa
      if (!checkUserRole(user, 'company')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      try {
        console.log('Buscando solicitações completas...');
        const completedRequests = await db.select()
          .from(freightRequests)
          .where(eq(freightRequests.status, 'completed'));
          
        console.log(`Encontradas ${completedRequests.length} solicitações completas`);
        
        // Adicionar dados relacionados
        const requestsWithData = await Promise.all(
          completedRequests.map(async (req) => await getFreightRequestWithQuote(req.id))
        );
        
        console.log('Dados retornados:', JSON.stringify(requestsWithData));
        
        return res.status(200).json(requestsWithData);
      } catch (error) {
        console.error('Erro ao obter solicitações completas:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
    default:
      return res.status(404).json({ error: 'Rota não encontrada' });
  }
}