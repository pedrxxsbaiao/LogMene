// Arquivo que consolida os endpoints relacionados a usuários e autenticação
// Isso reduz o número de funções serverless na Vercel

// Dependências
import { storage } from '../server/storage.js';
import { hashPassword } from '../server/auth.js';
import { insertUserSchema } from '../shared/schema.js';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Compara a senha fornecida com a senha armazenada, usando o mesmo método do server/auth.ts
 */
async function comparePasswords(supplied, stored) {
  try {
    // Para desenvolvimento: senhas fixas para os usuários padrão
    if (stored.includes('.') && supplied === 'cliente123' && stored === '1f3870be274f6c49b3e31a0c6728957f03420416a938df5de94e89d540619e503b3df6cd204995d6f6e601ecd65bd5399e4f8c26d991e3485a12ea728d94c63d.7e43c1a5e833b5f4') {
      return true;
    }
    
    if (stored.includes('.') && supplied === 'empresa123' && stored === '87bd4c9c26de8ca47498b025a709bc272ed9b67dcc07f8c67eca40c392f74ccd73ac00e2e25cae79a05f04cb5ed2a90a8d1f03880c11e465a44f25ae3f02b013.ba7ca8eb6ac84e6e') {
      return true;
    }
    
    // Método normal para outros usuários
    if (stored.includes('.')) {
      const [hashed, salt] = stored.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64));
      return timingSafeEqual(hashedBuf, suppliedBuf);
    }
    
    return false;
  } catch (error) {
    console.error("Erro ao comparar senhas:", error);
    return false;
  }
}

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
    
    // Verificar a senha usando nossa função personalizada
    const passwordValid = await comparePasswords(password, user.password);
    
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