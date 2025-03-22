// Arquivo que consolida os endpoints principais do sistema de fretes
// Isso reduz o número de funções serverless na Vercel

// Importar dependências necessárias
import { storage } from "../server/storage.js";
import * as schema from "../shared/schema.js";
import { z } from "zod";

/**
 * Handler principal que roteia as solicitações para as sub-funções apropriadas
 */
export default async function handler(req, res) {
  // Extrair o tipo de operação e o recurso da consulta
  const { op, resource } = req.query;
  
  try {
    // Primeiro verifica o recurso
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
          validResources: ['freight-requests', 'quotes', 'delivery-proofs'],
          validOperations: {
            'freight-requests': ['get', 'list', 'create', 'update'],
            'quotes': ['get', 'create'],
            'delivery-proofs': ['get', 'create']
          }
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

// Função auxiliar para autenticar usuário
function authenticateUser(req) {
  if (!req.session || !req.session.user) {
    return null;
  }
  return req.session.user;
}

// Função auxiliar para verificar papel do usuário
function checkUserRole(user, role) {
  if (!user) {
    return false;
  }
  return user.role === role;
}

/**
 * Handler para operações em solicitações de frete
 */
async function freightRequestsHandler(op, req, res) {
  // Autenticar usuário
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  switch (op) {
    case 'get':
      return await getFreightRequest(req, res, user);
    case 'list':
      return await listFreightRequests(req, res, user);
    case 'create':
      return await createFreightRequest(req, res, user);
    case 'update':
      return await updateFreightRequestStatus(req, res, user);
    default:
      return res.status(400).json({ 
        error: 'Operação inválida para solicitações de frete',
        validOperations: ['get', 'list', 'create', 'update']
      });
  }
}

/**
 * Handler para operações em cotações
 */
async function quotesHandler(op, req, res) {
  // Autenticar usuário
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  switch (op) {
    case 'get':
      return await getQuote(req, res, user);
    case 'create':
      return await createQuote(req, res, user);
    default:
      return res.status(400).json({ 
        error: 'Operação inválida para cotações',
        validOperations: ['get', 'create']
      });
  }
}

/**
 * Handler para operações em comprovantes de entrega
 */
async function deliveryProofsHandler(op, req, res) {
  // Autenticar usuário
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  switch (op) {
    case 'get':
      return await getDeliveryProof(req, res, user);
    case 'create':
      return await createDeliveryProof(req, res, user);
    default:
      return res.status(400).json({ 
        error: 'Operação inválida para comprovantes de entrega',
        validOperations: ['get', 'create']
      });
  }
}

// Implementação das funções de solicitação de frete

async function getFreightRequest(req, res, user) {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'ID da solicitação é obrigatório' });
    }

    const freightRequest = await storage.getFreightRequestById(parseInt(id));
    
    if (!freightRequest) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    // Verificar permissão: apenas o cliente dono da solicitação ou qualquer empresa podem ver
    if (user.role === 'client' && freightRequest.userId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    return res.status(200).json(freightRequest);
  } catch (error) {
    console.error('Erro ao buscar solicitação de frete:', error);
    return res.status(500).json({ error: 'Erro ao buscar solicitação de frete' });
  }
}

async function listFreightRequests(req, res, user) {
  try {
    let freightRequests;
    
    // Filtrar por status se fornecido
    const { status } = req.query;
    
    if (user.role === 'client') {
      // Cliente vê apenas suas próprias solicitações
      freightRequests = await storage.getFreightRequestsByUserId(user.id);
      
      if (status) {
        freightRequests = freightRequests.filter(request => request.status === status);
      }
    } else {
      // Empresa vê todas as solicitações, filtradas por status se aplicável
      if (status === 'pending') {
        freightRequests = await storage.getPendingFreightRequests();
      } else if (status === 'active') {
        freightRequests = await storage.getActiveFreightRequests();
      } else if (status === 'completed') {
        freightRequests = await storage.getCompletedFreightRequests();
      } else {
        // Se não tiver filtro, pega tudo
        const pendingRequests = await storage.getPendingFreightRequests();
        const activeRequests = await storage.getActiveFreightRequests();
        const completedRequests = await storage.getCompletedFreightRequests();
        
        freightRequests = [
          ...pendingRequests,
          ...activeRequests,
          ...completedRequests
        ];
      }
    }
    
    return res.status(200).json(freightRequests);
  } catch (error) {
    console.error('Erro ao listar solicitações de frete:', error);
    return res.status(500).json({ error: 'Erro ao listar solicitações de frete' });
  }
}

async function createFreightRequest(req, res, user) {
  try {
    // Verificar se o usuário é cliente
    if (!checkUserRole(user, 'client')) {
      return res.status(403).json({ error: 'Apenas clientes podem criar solicitações de frete' });
    }
    
    // Validar dados da solicitação
    const requestData = req.body;
    
    // Adicionar o ID do usuário
    requestData.userId = user.id;
    requestData.status = 'pending';
    
    // Criar a solicitação no banco
    const newRequest = await storage.createFreightRequest(requestData);
    
    return res.status(201).json(newRequest);
  } catch (error) {
    console.error('Erro ao criar solicitação de frete:', error);
    return res.status(500).json({ error: 'Erro ao criar solicitação de frete' });
  }
}

async function updateFreightRequestStatus(req, res, user) {
  try {
    const { id } = req.query;
    const { status } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID da solicitação é obrigatório' });
    }
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }
    
    const requestId = parseInt(id);
    
    // Buscar a solicitação para verificar permissões
    const freightRequest = await storage.getFreightRequestById(requestId);
    
    if (!freightRequest) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    // Verificar permissões
    if (user.role === 'client') {
      // Cliente só pode modificar suas próprias solicitações e apenas para certos status
      if (freightRequest.userId !== user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      // Cliente só pode aceitar ou rejeitar cotações
      if (freightRequest.status !== 'quoted' || (status !== 'accepted' && status !== 'rejected')) {
        return res.status(403).json({ 
          error: 'Cliente só pode aceitar ou rejeitar cotações',
          currentStatus: freightRequest.status,
          requestedStatus: status
        });
      }
    }
    
    // Empresas têm mais flexibilidade nos status que podem definir
    
    // Atualizar o status
    const updatedRequest = await storage.updateFreightRequestStatus(requestId, status);
    
    if (!updatedRequest) {
      return res.status(500).json({ error: 'Erro ao atualizar status da solicitação' });
    }
    
    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Erro ao atualizar status da solicitação:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status da solicitação' });
  }
}

// Implementação das funções de cotação

async function getQuote(req, res, user) {
  try {
    const { requestId } = req.query;
    
    if (!requestId) {
      return res.status(400).json({ error: 'ID da solicitação é obrigatório' });
    }
    
    const quote = await storage.getQuoteByRequestId(parseInt(requestId));
    
    if (!quote) {
      return res.status(404).json({ error: 'Cotação não encontrada' });
    }
    
    // Verificar permissão: buscar a solicitação associada
    const freightRequest = await storage.getFreightRequestById(parseInt(requestId));
    
    if (!freightRequest) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    // Cliente só pode ver cotações das suas solicitações
    if (user.role === 'client' && freightRequest.userId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    return res.status(200).json(quote);
  } catch (error) {
    console.error('Erro ao buscar cotação:', error);
    return res.status(500).json({ error: 'Erro ao buscar cotação' });
  }
}

async function createQuote(req, res, user) {
  try {
    // Verificar se o usuário é empresa
    if (!checkUserRole(user, 'company')) {
      return res.status(403).json({ error: 'Apenas empresas podem criar cotações' });
    }
    
    const { requestId, value, observations, expiresAt } = req.body;
    
    if (!requestId || !value) {
      return res.status(400).json({ error: 'ID da solicitação e valor são obrigatórios' });
    }
    
    // Verificar se a solicitação existe e está no status adequado
    const freightRequest = await storage.getFreightRequestById(parseInt(requestId));
    
    if (!freightRequest) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    if (freightRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Não é possível criar cotação para solicitação que não está pendente',
        currentStatus: freightRequest.status 
      });
    }
    
    // Verificar se já existe cotação para esta solicitação
    const existingQuote = await storage.getQuoteByRequestId(parseInt(requestId));
    
    if (existingQuote) {
      return res.status(400).json({ error: 'Já existe uma cotação para esta solicitação' });
    }
    
    // Criar a cotação
    const newQuote = await storage.createQuote({
      requestId: parseInt(requestId),
      value,
      observations,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdAt: new Date()
    });
    
    // Atualizar o status da solicitação para 'quoted'
    await storage.updateFreightRequestStatus(parseInt(requestId), 'quoted');
    
    return res.status(201).json(newQuote);
  } catch (error) {
    console.error('Erro ao criar cotação:', error);
    return res.status(500).json({ error: 'Erro ao criar cotação' });
  }
}

// Implementação das funções de comprovante de entrega

async function getDeliveryProof(req, res, user) {
  try {
    const { requestId } = req.query;
    
    if (!requestId) {
      return res.status(400).json({ error: 'ID da solicitação é obrigatório' });
    }
    
    const deliveryProof = await storage.getDeliveryProofByRequestId(parseInt(requestId));
    
    if (!deliveryProof) {
      return res.status(404).json({ error: 'Comprovante de entrega não encontrado' });
    }
    
    // Verificar permissão: buscar a solicitação associada
    const freightRequest = await storage.getFreightRequestById(parseInt(requestId));
    
    if (!freightRequest) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    // Cliente só pode ver comprovantes das suas solicitações
    if (user.role === 'client' && freightRequest.userId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    return res.status(200).json(deliveryProof);
  } catch (error) {
    console.error('Erro ao buscar comprovante de entrega:', error);
    return res.status(500).json({ error: 'Erro ao buscar comprovante de entrega' });
  }
}

async function createDeliveryProof(req, res, user) {
  try {
    // Verificar se o usuário é empresa
    if (!checkUserRole(user, 'company')) {
      return res.status(403).json({ error: 'Apenas empresas podem enviar comprovantes de entrega' });
    }
    
    const { requestId, proofImage, observations } = req.body;
    
    if (!requestId || !proofImage) {
      return res.status(400).json({ error: 'ID da solicitação e imagem do comprovante são obrigatórios' });
    }
    
    // Verificar se a solicitação existe e está no status adequado
    const freightRequest = await storage.getFreightRequestById(parseInt(requestId));
    
    if (!freightRequest) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    
    if (freightRequest.status !== 'accepted') {
      return res.status(400).json({ 
        error: 'Não é possível enviar comprovante para solicitação que não está aceita',
        currentStatus: freightRequest.status 
      });
    }
    
    // Verificar se já existe comprovante para esta solicitação
    const existingProof = await storage.getDeliveryProofByRequestId(parseInt(requestId));
    
    if (existingProof) {
      return res.status(400).json({ error: 'Já existe um comprovante para esta solicitação' });
    }
    
    // Criar o comprovante
    const newProof = await storage.createDeliveryProof({
      requestId: parseInt(requestId),
      proofImage,
      observations,
      uploadedAt: new Date()
    });
    
    // Atualizar o status da solicitação para 'completed'
    await storage.updateFreightRequestStatus(parseInt(requestId), 'completed');
    
    return res.status(201).json(newProof);
  } catch (error) {
    console.error('Erro ao criar comprovante de entrega:', error);
    return res.status(500).json({ error: 'Erro ao criar comprovante de entrega' });
  }
}