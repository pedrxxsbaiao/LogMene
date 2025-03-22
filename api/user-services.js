// Arquivo que consolida os endpoints relacionados a usuários (auth e notificações)
// Isso reduz o número de funções serverless na Vercel

// Importar dependências necessárias
import { storage } from "../server/storage.js";
import { hashPassword, comparePasswords } from "../server/auth.js";

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
  const method = req.method;

  // Login (POST)
  if (method === 'POST') {
    return await loginHandler(req, res);
  }
  // Logout (DELETE)
  else if (method === 'DELETE') {
    return await logoutHandler(req, res);
  }
  // Verificar autenticação atual (GET)
  else if (method === 'GET') {
    return await getCurrentUserHandler(req, res);
  }
  // Registro (PUT)
  else if (method === 'PUT') {
    return await registerHandler(req, res);
  }
  else {
    return res.status(405).json({ error: 'Método não permitido' });
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
    // Buscar o usuário pelo nome de usuário
    const user = await storage.getUserByUsername(username);

    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    // Verificar a senha
    const isValidPassword = await comparePasswords(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    // Criar sessão
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    };

    // Retornar informações do usuário (exceto a senha)
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro ao processar a solicitação de login' });
  }
}

/**
 * Handler para logout
 */
async function logoutHandler(req, res) {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Erro ao encerrar sessão:', err);
        return res.status(500).json({ error: 'Erro ao fazer logout' });
      }
    });
  }
  
  return res.status(200).json({ message: 'Logout realizado com sucesso' });
}

/**
 * Handler para obter usuário atual
 */
async function getCurrentUserHandler(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    // Buscar informações atualizadas do usuário
    const user = await storage.getUser(req.session.user.id);

    if (!user) {
      // Sessão existe mas usuário não foi encontrado no banco
      req.session.destroy();
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    // Retornar informações do usuário (exceto a senha)
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao buscar usuário atual:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuário atual' });
  }
}

/**
 * Handler para registro de usuário
 */
async function registerHandler(req, res) {
  const userData = req.body;

  if (!userData.username || !userData.password || !userData.role) {
    return res.status(400).json({ error: 'Dados de usuário incompletos' });
  }

  try {
    // Verificar se o usuário já existe
    const existingUser = await storage.getUserByUsername(userData.username);

    if (existingUser) {
      return res.status(409).json({ error: 'Nome de usuário já está em uso' });
    }

    // Hash da senha
    const hashedPassword = await hashPassword(userData.password);

    // Criar o usuário com a senha hash
    const newUser = await storage.createUser({
      ...userData,
      password: hashedPassword
    });

    // Remover a senha do objeto a ser retornado
    const { password: _, ...userWithoutPassword } = newUser;

    // Autenticar o usuário automaticamente
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      name: newUser.name
    };

    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
}

/**
 * Handler para operações de notificações
 */
async function notificationsHandler(req, res) {
  // Verificar autenticação
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const userId = req.session.user.id;
  const method = req.method;

  // Listar notificações (GET)
  if (method === 'GET') {
    try {
      const { unreadCount } = req.query;
      
      // Se o parâmetro unreadCount estiver presente, retornar apenas o número de não lidas
      if (unreadCount) {
        const count = await storage.getUnreadNotificationsCount(userId);
        return res.status(200).json({ count });
      }
      
      // Caso contrário, retornar a lista completa de notificações
      const notifications = await storage.getNotificationsByUserId(userId);
      return res.status(200).json(notifications);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  }
  // Marcar notificação como lida (PATCH)
  else if (method === 'PATCH') {
    try {
      const { id, markAll } = req.body;
      
      if (markAll) {
        // Marcar todas as notificações como lidas
        const count = await storage.markAllNotificationsAsRead(userId);
        return res.status(200).json({ 
          message: `${count} notificações marcadas como lidas`,
          count
        });
      } else if (id) {
        // Marcar uma notificação específica como lida
        const notification = await storage.markNotificationAsRead(id);
        
        if (!notification) {
          return res.status(404).json({ error: 'Notificação não encontrada' });
        }
        
        return res.status(200).json(notification);
      } else {
        return res.status(400).json({ error: 'Parâmetro id ou markAll é obrigatório' });
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
    }
  }
  // Criar notificação (POST)
  else if (method === 'POST') {
    try {
      const notificationData = req.body;
      
      if (!notificationData.userId || !notificationData.type || !notificationData.title) {
        return res.status(400).json({ error: 'Dados de notificação incompletos' });
      }
      
      // Verificar se o usuário que está criando é o mesmo que está recebendo ou tem permissão
      if (notificationData.userId !== userId && req.session.user.role !== 'company') {
        return res.status(403).json({ error: 'Sem permissão para criar notificação para outro usuário' });
      }
      
      // Adicionar campos automáticos
      notificationData.createdAt = new Date();
      notificationData.read = false;
      
      const notification = await storage.createNotification(notificationData);
      return res.status(201).json(notification);
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return res.status(500).json({ error: 'Erro ao criar notificação' });
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}