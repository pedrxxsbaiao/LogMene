import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { 
  insertFreightRequestSchema, 
  insertQuoteSchema, 
  insertUserSchema, 
  insertDeliveryProofSchema, 
  insertNotificationSchema,
  freightRequests,
  quotes,
  users,
  deliveryProofs,
  notifications,
  User
} from "@shared/schema";
import { db } from "./db";
import { eq, inArray } from "drizzle-orm";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import axios from "axios";
import { fetchCNPJData, formatAddress, validateCNPJ } from "./services/cnpj-service";
import { 
  sendStatusUpdateNotification, 
  sendQuoteNotification, 
  sendDeliveryProofNotification,
  sendNewFreightRequestNotification
} from "./services/notification-service";
import { distanceHandler } from "./distance-handler";
import express from 'express';
import { InsertNotification } from '@shared/schema';

const router = express.Router();

// Tipo para o usuário autenticado
interface AuthenticatedRequest extends Request {
  user: User;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Set up authentication routes
  setupAuth(app);

  // Rota para criar um novo pedido de frete
  app.post("/api/freight-requests", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertFreightRequestSchema.parse(req.body);
      const result = await db.insert(freightRequests).values(validatedData).returning();
      res.json(result[0]);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Rota para buscar solicitações pendentes
  app.get("/api/freight-requests/pending", ensureAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as User;
      // Verificar se é uma empresa
      if (user.role !== "company") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const pendingRequests = await db.select()
        .from(freightRequests)
        .where(eq(freightRequests.status, "pending"));

      // Adicionar dados relacionados
      const requestsWithData = await Promise.all(
        pendingRequests.map(async (request) => {
          // Buscar cotação se existir
          const [quote] = await db.select()
            .from(quotes)
            .where(eq(quotes.requestId, request.id))
            .limit(1);

          // Buscar nome do cliente
          const [client] = await db.select()
            .from(users)
            .where(eq(users.id, request.userId))
            .limit(1);

          return {
            ...request,
            quote: quote || undefined,
            clientName: client?.fullName
          };
        })
      );

      res.json(requestsWithData);
    } catch (error) {
      console.error("Erro ao buscar solicitações pendentes:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota para buscar solicitações ativas
  app.get("/api/freight-requests/active", ensureAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as User;
      // Verificar se é uma empresa
      if (user.role !== "company") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const activeRequests = await db.select()
        .from(freightRequests)
        .where(inArray(freightRequests.status, ["quoted", "accepted"]));

      // Adicionar dados relacionados
      const requestsWithData = await Promise.all(
        activeRequests.map(async (request) => {
          // Buscar cotação se existir
          const [quote] = await db.select()
            .from(quotes)
            .where(eq(quotes.requestId, request.id))
            .limit(1);

          // Buscar nome do cliente
          const [client] = await db.select()
            .from(users)
            .where(eq(users.id, request.userId))
            .limit(1);

          return {
            ...request,
            quote: quote || undefined,
            clientName: client?.fullName
          };
        })
      );

      res.json(requestsWithData);
    } catch (error) {
      console.error("Erro ao buscar solicitações ativas:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota para buscar solicitações completas
  app.get("/api/freight-requests/completed", ensureAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as User;
      // Verificar se é uma empresa
      if (user.role !== "company") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const completedRequests = await db.select()
        .from(freightRequests)
        .where(eq(freightRequests.status, "completed"));

      // Adicionar dados relacionados
      const requestsWithData = await Promise.all(
        completedRequests.map(async (request) => {
          // Buscar cotação se existir
          const [quote] = await db.select()
            .from(quotes)
            .where(eq(quotes.requestId, request.id))
            .limit(1);

          // Buscar nome do cliente
          const [client] = await db.select()
            .from(users)
            .where(eq(users.id, request.userId))
            .limit(1);

          return {
            ...request,
            quote: quote || undefined,
            clientName: client?.fullName
          };
        })
      );

      res.json(requestsWithData);
    } catch (error) {
      console.error("Erro ao buscar solicitações completas:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota para criar uma nova cotação
  app.post("/api/quotes", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertQuoteSchema.parse(req.body);
      const result = await db.insert(quotes).values(validatedData).returning();
      res.json(result[0]);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Rota para criar um novo usuário
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const result = await db.insert(users).values(validatedData).returning();
      res.json(result[0]);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Rota para criar um novo comprovante de entrega
  app.post("/api/delivery-proofs", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDeliveryProofSchema.parse(req.body);
      const result = await db.insert(deliveryProofs).values(validatedData).returning();
      res.json(result[0]);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Rota para criar uma nova notificação
  router.post('/notifications', async (req, res) => {
    try {
      const notification: InsertNotification = req.body;
      
      // Validar dados da notificação
      if (!notification.userId || !notification.type || !notification.message) {
        return res.status(400).json({ error: 'Dados da notificação inválidos' });
      }

      // Criar notificação no banco de dados
      const createdNotification = await storage.createNotification(notification);
      return res.status(201).json(createdNotification);
    } catch (error) {
      log(`Erro ao criar notificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'routes');
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para buscar dados de CNPJ
  app.get("/api/cnpj/:cnpj", ensureAuthenticated, async (req, res) => {
    try {
      const cnpj = req.params.cnpj;
      const data = await fetchCNPJData(cnpj);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  // Rota para calcular distância
  app.post("/api/distance", ensureAuthenticated, async (req, res) => {
    try {
      const { origin, destination } = req.body;
      const result = await distanceHandler(origin, destination);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  // Rota para enviar notificação de atualização de status
  app.post("/api/notifications/status-update", ensureAuthenticated, async (req, res) => {
    try {
      const { userId, requestId, status } = req.body;
      const result = await sendStatusUpdateNotification(userId, requestId, status);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  // Rota para enviar notificação de cotação
  app.post("/api/notifications/quote", ensureAuthenticated, async (req, res) => {
    try {
      const { userId, requestId, value } = req.body;
      const result = await sendQuoteNotification(userId, requestId, value);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  // Rota para enviar notificação de comprovante de entrega
  app.post("/api/notifications/delivery-proof", ensureAuthenticated, async (req, res) => {
    try {
      const { userId, requestId } = req.body;
      const result = await sendDeliveryProofNotification(userId, requestId);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  // Rota para enviar notificação de novo pedido de frete
  app.post("/api/notifications/new-freight-request", ensureAuthenticated, async (req, res) => {
    try {
      const { userId, requestId, clientName, freightDetails } = req.body;
      const result = await sendNewFreightRequestNotification(userId, requestId, clientName, freightDetails);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  return httpServer;
}

// Funções auxiliares
function handleZodError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    res.status(400).json({ error: fromZodError(error).message });
  } else {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
  }
}

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  next();
}

export default router; 