// Arquivo que consolida os endpoints relacionados aos recursos principais da aplicação
// Isso reduz o número de funções serverless na Vercel

// Dependências
import { storage } from '../server/storage.js';
import { requestStatus, insertFreightRequestSchema, insertQuoteSchema, insertDeliveryProofSchema } from '../shared/schema.js';
import { hashPassword } from '../server/auth.js';
import { sendStatusUpdateNotification, sendQuoteNotification, sendDeliveryProofNotification, sendNewFreightRequestNotification } from '../server/services/notification-service.js';

/**
 * Handler principal que roteia as solicitações para as sub-funções apropriadas
 */
export default async function handler(req, res) {
  // Extrair o tipo de operação e recurso da consulta
  const { resource, op } = req.query;
  
  try {
    switch (resource) {
      case 'freight-requests':
        return await freightRequestsHandler(op, req, res);
      case 'quotes':
        return await quotesHandler(op, req, res);
      case 'delivery-proofs':
        return await deliveryProofsHandler(op, req, res);
      default:
        return res.status(400).json({
          error: 'Recurso inválido',
          validResources: ['freight-requests', 'quotes', 'delivery-proofs']
        });
    }
  } catch (error) {
    console.error(`Erro em resources/${resource}/${op}:`, error);
    return res.status(500).json({
      error: 'Erro interno no servidor',
      message: error.message
    });
  }
}

function authenticateUser(req) {
  if (!req.headers.authorization) {
    return null;
  }

  try {
    // Formato esperado: "Bearer JSON_USER_OBJECT"
    const authParts = req.headers.authorization.split(' ');
    if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
      return null;
    }

    // Decodificar o JSON do usuário
    return JSON.parse(decodeURIComponent(authParts[1]));
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return null;
  }
}

function checkUserRole(user, role) {
  return user && user.role === role;
}

/**
 * Handler para operações em solicitações de frete
 */
async function freightRequestsHandler(op, req, res) {
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const method = req.method;

  try {
    // Operações que não precisam de um ID específico
    if (method === 'GET') {
      if (op === 'all') {
        return await listFreightRequests(req, res, user);
      }
    } else if (method === 'POST') {
      if (!op) {
        return await createFreightRequest(req, res, user);
      }
    }

    // Operações que precisam de um ID específico
    if (op) {
      // Se op for numérico, é um ID de requisição
      const id = parseInt(op);
      if (!isNaN(id)) {
        if (method === 'GET') {
          return await getFreightRequest(req, res, user);
        } else if (method === 'PATCH') {
          return await updateFreightRequestStatus(req, res, user);
        }
      }
    }

    return res.status(400).json({ error: 'Operação inválida' });
  } catch (error) {
    console.error('Erro ao processar solicitação de frete:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

/**
 * Handler para operações em cotações
 */
async function quotesHandler(op, req, res) {
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const method = req.method;

  try {
    // Criação de cotação
    if (method === 'POST' && !op) {
      return await createQuote(req, res, user);
    }

    // Obter cotação por ID de requisição
    if (method === 'GET' && op) {
      // Se op for numérico, é um ID de requisição
      const requestId = parseInt(op);
      if (!isNaN(requestId)) {
        return await getQuote(req, res, user);
      }
    }

    return res.status(400).json({ error: 'Operação inválida' });
  } catch (error) {
    console.error('Erro ao processar cotação:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

/**
 * Handler para operações em comprovantes de entrega
 */
async function deliveryProofsHandler(op, req, res) {
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const method = req.method;

  try {
    // Criação de comprovante
    if (method === 'POST' && !op) {
      return await createDeliveryProof(req, res, user);
    }

    // Obter comprovante por ID de requisição
    if (method === 'GET' && op) {
      // Se op for numérico, é um ID de requisição
      const requestId = parseInt(op);
      if (!isNaN(requestId)) {
        return await getDeliveryProof(req, res, user);
      }
    }

    return res.status(400).json({ error: 'Operação inválida' });
  } catch (error) {
    console.error('Erro ao processar comprovante de entrega:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

async function getFreightRequest(req, res, user) {
  const id = parseInt(req.query.op);
  
  try {
    const request = await storage.getFreightRequestById(id);
    
    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    // Verificar se o usuário tem permissão (dono da requisição ou empresa)
    if (user.role !== 'company' && request.userId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    return res.status(200).json(request);
  } catch (error) {
    console.error('Erro ao buscar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

async function listFreightRequests(req, res, user) {
  try {
    let requests;
    
    if (user.role === 'client') {
      // Cliente só pode ver suas próprias solicitações
      requests = await storage.getFreightRequestsByUserId(user.id);
    } else if (user.role === 'company') {
      // Empresa pode ver todas as solicitações pendentes e ativas
      const { status } = req.query;
      
      if (status === 'pending') {
        requests = await storage.getPendingFreightRequests();
      } else if (status === 'active') {
        requests = await storage.getActiveFreightRequests();
      } else if (status === 'completed') {
        requests = await storage.getCompletedFreightRequests();
      } else {
        // Por padrão, mostrar as solicitações pendentes
        requests = await storage.getPendingFreightRequests();
      }
    } else {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    return res.status(200).json(requests);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

async function createFreightRequest(req, res, user) {
  try {
    // Verificar se o usuário é cliente
    if (user.role !== 'client') {
      return res.status(403).json({ error: 'Apenas clientes podem criar solicitações de frete' });
    }
    
    // Validar os dados da requisição
    const { originName, originStreet, originCity, originState, originZipCode, destinationName, destinationStreet, destinationCity, destinationState, destinationZipCode, cargo, weight, dimensions, specialInstructions } = req.body;
    
    const insertData = {
      userId: user.id,
      status: 'pending',
      originName,
      originStreet,
      originCity,
      originState,
      originZipCode,
      destinationName,
      destinationStreet,
      destinationCity,
      destinationState,
      destinationZipCode,
      cargo,
      weight,
      dimensions,
      specialInstructions,
      createdAt: new Date()
    };
    
    // Validar com o schema
    const validationResult = insertFreightRequestSchema.safeParse(insertData);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validationResult.error.format()
      });
    }
    
    // Criar a solicitação
    const request = await storage.createFreightRequest(insertData);
    
    // Enviar notificação para todas as empresas
    const companies = await storage.getAllCompanies();
    for (const company of companies) {
      // Gerar detalhes do frete para a notificação
      const freightDetails = `Carga: ${cargo}, Origem: ${originCity}/${originState}, Destino: ${destinationCity}/${destinationState}`;
      
      // Enviar notificação in-app
      await sendNewFreightRequestNotification(
        company.id,
        request.id,
        user.name || user.username,
        freightDetails
      );
    }
    
    return res.status(201).json(request);
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

async function updateFreightRequestStatus(req, res, user) {
  const id = parseInt(req.query.op);
  const { status } = req.body;
  
  try {
    if (!status || !requestStatus.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    // Buscar a solicitação atual
    const existingRequest = await storage.getFreightRequestById(id);
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    // Verificar permissões
    if (user.role === 'client') {
      // Cliente só pode alterar o status de suas próprias solicitações
      if (existingRequest.userId !== user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      // Cliente só pode aceitar/rejeitar cotações ou cancelar
      if (existingRequest.status !== 'quoted' || (status !== 'accepted' && status !== 'rejected')) {
        return res.status(400).json({ error: 'Operação inválida' });
      }
    } else if (user.role === 'company') {
      // Empresa pode alterar apenas para status específicos
      const allowedTransitions = {
        pending: ['quoted'],
        quoted: ['pending'],
        accepted: ['completed']
      };
      
      const allowedStatuses = allowedTransitions[existingRequest.status] || [];
      
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Transição de status inválida' });
      }
    } else {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Atualizar o status
    const updatedRequest = await storage.updateFreightRequestStatus(id, status);
    
    if (!updatedRequest) {
      return res.status(500).json({ error: 'Erro ao atualizar status' });
    }
    
    // Enviar notificação
    await sendStatusUpdateNotification(
      existingRequest.userId,
      id,
      status
    );
    
    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

async function getQuote(req, res, user) {
  const requestId = parseInt(req.query.op);
  
  try {
    const request = await storage.getFreightRequestById(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    // Verificar se o usuário tem permissão (dono da requisição ou empresa)
    if (user.role !== 'company' && request.userId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const quote = await storage.getQuoteByRequestId(requestId);
    
    if (!quote) {
      return res.status(404).json({ error: 'Cotação não encontrada' });
    }
    
    return res.status(200).json(quote);
  } catch (error) {
    console.error('Erro ao buscar cotação:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

async function createQuote(req, res, user) {
  try {
    // Verificar se o usuário é uma empresa
    if (user.role !== 'company') {
      return res.status(403).json({ error: 'Apenas empresas podem criar cotações' });
    }
    
    // Validar os dados da requisição
    const { requestId, value, details, estimatedDeliveryTime } = req.body;
    
    // Verificar se a solicitação existe e está pendente
    const request = await storage.getFreightRequestById(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'A solicitação não está mais pendente' });
    }
    
    // Verificar se já existe uma cotação para esta solicitação
    const existingQuote = await storage.getQuoteByRequestId(requestId);
    
    if (existingQuote) {
      return res.status(400).json({ error: 'Já existe uma cotação para esta solicitação' });
    }
    
    const insertData = {
      requestId,
      companyId: user.id,
      value,
      details,
      estimatedDeliveryTime,
      createdAt: new Date()
    };
    
    // Validar com o schema
    const validationResult = insertQuoteSchema.safeParse(insertData);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validationResult.error.format()
      });
    }
    
    // Criar a cotação
    const quote = await storage.createQuote(insertData);
    
    // Atualizar o status da solicitação para "quoted"
    await storage.updateFreightRequestStatus(requestId, 'quoted');
    
    // Enviar notificação ao cliente
    await sendQuoteNotification(request.userId, requestId, value);
    
    return res.status(201).json(quote);
  } catch (error) {
    console.error('Erro ao criar cotação:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

async function getDeliveryProof(req, res, user) {
  const requestId = parseInt(req.query.op);
  
  try {
    const request = await storage.getFreightRequestById(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    // Verificar se o usuário tem permissão (dono da requisição ou empresa)
    if (user.role !== 'company' && request.userId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const deliveryProof = await storage.getDeliveryProofByRequestId(requestId);
    
    if (!deliveryProof) {
      return res.status(404).json({ error: 'Comprovante não encontrado' });
    }
    
    return res.status(200).json(deliveryProof);
  } catch (error) {
    console.error('Erro ao buscar comprovante:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

async function createDeliveryProof(req, res, user) {
  try {
    // Verificar se o usuário é uma empresa
    if (user.role !== 'company') {
      return res.status(403).json({ error: 'Apenas empresas podem enviar comprovantes de entrega' });
    }
    
    // Validar os dados da requisição
    const { requestId, imageData, comments, deliveryDate } = req.body;
    
    // Verificar se a solicitação existe e está aceita
    const request = await storage.getFreightRequestById(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    if (request.status !== 'accepted') {
      return res.status(400).json({ error: 'A solicitação não está em status "aceita"' });
    }
    
    // Verificar se já existe um comprovante para esta solicitação
    const existingProof = await storage.getDeliveryProofByRequestId(requestId);
    
    if (existingProof) {
      return res.status(400).json({ error: 'Já existe um comprovante para esta solicitação' });
    }
    
    const insertData = {
      requestId,
      companyId: user.id,
      imageData,
      comments,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
      uploadDate: new Date()
    };
    
    // Validar com o schema
    const validationResult = insertDeliveryProofSchema.safeParse(insertData);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validationResult.error.format()
      });
    }
    
    // Criar o comprovante
    const proof = await storage.createDeliveryProof(insertData);
    
    // Atualizar o status da solicitação para "completed"
    await storage.updateFreightRequestStatus(requestId, 'completed');
    
    // Enviar notificação ao cliente
    await sendDeliveryProofNotification(request.userId, requestId);
    
    return res.status(201).json(proof);
  } catch (error) {
    console.error('Erro ao criar comprovante:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}