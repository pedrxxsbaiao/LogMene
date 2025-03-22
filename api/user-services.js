// Arquivo que consolida os endpoints relacionados a usuários e autenticação
// Isso reduz o número de funções serverless na Vercel

// Dependências
import { storage } from '../server/storage.js';
import { hashPassword } from '../server/auth.js';
import { insertUserSchema } from '../shared/schema.js';
import { compareSync } from 'bcrypt';

/**
 * Handler principal que roteia as solicitações para as sub-funções apropriadas
 */
export default async function handler(req, res) {
  // Extrair o tipo de operação da consulta
  const { op } = req.query;
  
  try {
    switch (op) {
      case 'auth':
        return await authHandler(req, res);
      case 'notifications':
        return await notificationsHandler(req, res);
      default:
        return res.status(400).json({ 
          error: 'Operação inválida',
          validOperations: ['auth', 'notifications']
        });
    }
  } catch (error) {
    console.error(`Erro em user-services/${op}:`, error);
    return res.status(500).json({ 
      error: 'Erro interno no servidor',
      message: error.message
    });
  }
}

/**
 * Handler para autenticação de usuários
 */
async function authHandler(req, res) {
  const subOp = req.query.subOp || '';
  const method = req.method;
  
  try {
    switch (subOp) {
      case 'login':
        if (method === 'POST') {
          return await loginHandler(req, res);
        }
        break;
      case 'logout':
        if (method === 'POST') {
          return await logoutHandler(req, res);
        }
        break;
      case 'register':
        if (method === 'POST') {
          return await registerHandler(req, res);
        }
        break;
      case 'current':
        if (method === 'GET') {
          return await getCurrentUserHandler(req, res);
        }
        break;
      default:
        return res.status(400).json({ 
          error: 'Operação inválida',
          validOperations: ['login', 'logout', 'register', 'current']
        });
    }
    
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error(`Erro em auth/${subOp}:`, error);
    return res.status(500).json({ 
      error: 'Erro interno no servidor',
      message: error.message
    });
  }
}

/**
 * Handler para login
 */
async function loginHandler(req, res) {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }
  
  try {
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    // Para simplificar, vamos supor que a senha não esteja hasheada no banco de dados
    // Em um ambiente real, você usaria bcrypt.compare ou algo semelhante
    const passwordValid = compareSync(password, user.password);
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    
    // Remover a senha antes de enviar o usuário
    const { password: _, ...userWithoutPassword } = user;
    
    // Em um cenário real, você configuraria uma sessão ou geraria um token JWT
    // Para simplificar, vamos apenas retornar o usuário
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

/**
 * Handler para logout
 */
async function logoutHandler(req, res) {
  // Em um cenário real, você invalidaria o token ou destruiria a sessão
  // Para simplificar, vamos apenas retornar sucesso
  return res.status(200).json({ success: true });
}

/**
 * Handler para obter usuário atual
 */
async function getCurrentUserHandler(req, res) {
  // Em um cenário real, você verificaria o token ou a sessão
  // Para simplificar, vamos supor que o usuário está sendo passado no cabeçalho
  
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  try {
    // Formato esperado: "Bearer JSON_USER_OBJECT"
    const authParts = req.headers.authorization.split(' ');
    if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Formato de autorização inválido' });
    }
    
    // Decodificar o JSON do usuário
    const user = JSON.parse(decodeURIComponent(authParts[1]));
    
    // Verificar se o usuário existe no banco de dados
    const dbUser = await storage.getUser(user.id);
    
    if (!dbUser) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    // Remover a senha antes de enviar o usuário
    const { password: _, ...userWithoutPassword } = dbUser;
    
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return res.status(401).json({ error: 'Não autorizado' });
  }
}

/**
 * Handler para registro de usuário
 */
async function registerHandler(req, res) {
  const userData = req.body;
  
  if (!userData.username || !userData.password || !userData.role) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  
  try {
    // Verificar se já existe um usuário com o mesmo username
    const existingUser = await storage.getUserByUsername(userData.username);
    
    if (existingUser) {
      return res.status(400).json({ error: 'Nome de usuário já existe' });
    }
    
    // Hash da senha
    const hashedPassword = await hashPassword(userData.password);
    
    // Criar o usuário com a senha hasheada
    const insertData = {
      ...userData,
      password: hashedPassword,
      createdAt: new Date()
    };
    
    // Validar com o schema
    const validationResult = insertUserSchema.safeParse(insertData);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validationResult.error.format()
      });
    }
    
    const user = await storage.createUser(insertData);
    
    // Remover a senha antes de enviar o usuário
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

/**
 * Handler para operações de notificações
 */
async function notificationsHandler(req, res) {
  const subOp = req.query.subOp || '';
  const method = req.method;
  
  // Autenticar o usuário
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  let user;
  try {
    // Formato esperado: "Bearer JSON_USER_OBJECT"
    const authParts = req.headers.authorization.split(' ');
    if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Formato de autorização inválido' });
    }
    
    // Decodificar o JSON do usuário
    user = JSON.parse(decodeURIComponent(authParts[1]));
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  try {
    // Listar notificações
    if (subOp === 'list' && method === 'GET') {
      const notifications = await storage.getNotificationsByUserId(user.id);
      return res.status(200).json(notifications);
    }
    
    // Marcar notificação como lida
    if (subOp === 'read' && method === 'POST') {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'ID da notificação é obrigatório' });
      }
      
      const notification = await storage.markNotificationAsRead(id);
      
      if (!notification) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }
      
      return res.status(200).json(notification);
    }
    
    // Marcar todas as notificações como lidas
    if (subOp === 'read-all' && method === 'POST') {
      const count = await storage.markAllNotificationsAsRead(user.id);
      return res.status(200).json({ success: true, count });
    }
    
    // Contar notificações não lidas
    if (subOp === 'unread-count' && method === 'GET') {
      const count = await storage.getUnreadNotificationsCount(user.id);
      return res.status(200).json({ count });
    }
    
    return res.status(400).json({ 
      error: 'Operação inválida',
      validOperations: ['list', 'read', 'read-all', 'unread-count']
    });
  } catch (error) {
    console.error(`Erro em notifications/${subOp}:`, error);
    return res.status(500).json({ 
      error: 'Erro interno no servidor',
      message: error.message
    });
  }
}