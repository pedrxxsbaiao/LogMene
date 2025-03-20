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
  freightRequests
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import { sendEmail, sendNewFreightRequestEmail } from "./services/mailersend-service";
import axios from "axios";
import { fetchCNPJData, formatAddress, validateCNPJ } from "./services/cnpj-service";
// Serviço de SMS removido conforme solicitação do cliente
// Serviço de WhatsApp removido conforme solicitação do cliente
import { 
  sendStatusUpdateNotification, 
  sendQuoteNotification, 
  sendDeliveryProofNotification,
  sendNewFreightRequestNotification
} from "./services/notification-service";


export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Rota para testar envio de email usando SMTP do MailerSend
  app.get("/api/test/smtp", async (req, res) => {
    try {
      // Verificando se o email fornecido tem um domínio verificado
      // MailerSend só permite enviar para domínios verificados
      const userEmail = req.query.email as string || "empresa@teste.com";
      
      // A melhor prática seria usar um email verificado na plataforma MailerSend
      // Para teste, usamos bigstone.dev.br, que é um domínio verificado
      const testEmail = userEmail.includes("@bigstone.dev.br") ? 
        userEmail : "test@bigstone.dev.br";
      
      console.log(`Iniciando teste de email via SMTP para: ${testEmail} (original: ${userEmail})`);
      
      // Importar o serviço SMTP de forma dinâmica para evitar problemas de ciclo de dependência
      const { sendEmailViaSMTP } = await import('./services/mailersend-smtp-service');
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
            <h2>LogMene - Teste SMTP</h2>
          </div>
          <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
            <p>Este é um email de teste do sistema LogMene usando conexão <strong>SMTP</strong> com o MailerSend.</p>
            <p>Se você está recebendo este email, o serviço de email via SMTP está funcionando corretamente!</p>
            <p>Data e hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Nota:</strong> O MailerSend requer que o domínio do destinatário seja verificado. 
            ${userEmail !== testEmail ? `Por isso, redirecionamos o email para ${testEmail} em vez de ${userEmail}.` : ''}
            </p>
          </div>
          <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
            <p>Este é um email automático de teste, por favor não responda.</p>
            <p>&copy; ${new Date().getFullYear()} LogMene. Todos os direitos reservados.</p>
          </div>
        </div>
      `;
      
      const result = await sendEmailViaSMTP({
        to: testEmail,
        subject: "Teste SMTP - LogMene",
        html: htmlContent
      });
      
      if (result) {
        console.log(`Email SMTP de teste enviado com sucesso para: ${testEmail}`);
        res.json({ 
          success: true, 
          message: `Email de teste enviado com sucesso para ${testEmail} via SMTP`,
          note: userEmail !== testEmail ? 
            `O email foi enviado para ${testEmail} em vez de ${userEmail} porque o MailerSend requer que o domínio do destinatário seja verificado.` : 
            undefined
        });
      } else {
        console.error(`Falha ao enviar email SMTP de teste para: ${testEmail}`);
        res.status(500).json({ 
          success: false, 
          message: "Falha ao enviar email de teste via SMTP"
        });
      }
    } catch (error) {
      console.error("Erro geral no teste SMTP:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro interno ao processar a requisição SMTP",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para testar o MailerSend diretamente pela API
  app.get("/api/test/mailersend", async (req, res) => {
    try {
      const testEmail = req.query.email as string || "pedroxxsb@gmail.com";
      
      console.log(`Iniciando teste direto da API do MailerSend para: ${testEmail}`);
      
      const apiUrl = 'https://api.mailersend.com/v1/email';
      const mailersendApiKey = process.env.MAILERSEND_API_KEY;
      
      if (!mailersendApiKey) {
        return res.status(500).json({ 
          success: false, 
          message: "API key do MailerSend não encontrada nas variáveis de ambiente" 
        });
      }
      
      const emailData = {
        from: {
          email: "no-reply@mailersend.net" // Email padrão do MailerSend que não precisa de verificação
        },
        to: [
          {
            email: testEmail
          }
        ],
        subject: "Teste Direto API MailerSend - LogMene",
        text: `Este é um email de teste direto da API do MailerSend enviado em ${new Date().toLocaleString('pt-BR')}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
              <h2>LogMene - Teste Direto API</h2>
            </div>
            <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
              <p>Este é um email de teste <strong>direto da API</strong> do MailerSend.</p>
              <p>Se você está recebendo este email, a conexão direta com a API está funcionando corretamente!</p>
              <p>Data e hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
              <p>Este é um email automático de teste, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} LogMene. Todos os direitos reservados.</p>
            </div>
          </div>
        `
      };
      
      try {
        const response = await axios.post(apiUrl, emailData, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${mailersendApiKey}`
          }
        });
        
        console.log("Resposta da API do MailerSend:", response.data);
        res.json({ 
          success: true, 
          message: `Email enviado com sucesso para ${testEmail} usando chamada direta à API`,
          response: response.data
        });
      } catch (apiError: any) {
        console.error("Erro na chamada da API do MailerSend:", apiError);
        console.error("Resposta de erro:", apiError.response?.data);
        
        res.status(500).json({
          success: false,
          message: "Erro ao chamar a API do MailerSend",
          error: apiError.message,
          details: apiError.response?.data || 'Sem detalhes do erro'
        });
      }
    } catch (error) {
      console.error("Erro geral:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro interno ao processar a requisição",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Rota para testar o envio de email usando MailerSend
  app.get("/api/test/send-email", async (req, res) => {
    try {
      const testEmail = req.query.email as string || "pedroxxsb@gmail.com";
      
      console.log(`Iniciando teste de email usando MailerSend para: ${testEmail}`);
      
      const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
              <h2>LogMene - Sistema de Logística</h2>
            </div>
            <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
              <p>Este é um email de teste do sistema LogMene usando o serviço <strong>MailerSend</strong>.</p>
              <p>Se você está recebendo este email, o serviço de email está funcionando corretamente!</p>
              <p>Data e hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
              <p>Este é um email automático de teste, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} LogMene. Todos os direitos reservados.</p>
            </div>
          </div>
        `;
        
      const result = await sendEmail({
        to: testEmail,
        subject: "Teste de Email - LogMene",
        html: htmlContent
      });
      
      if (result) {
        console.log(`Email de teste enviado com sucesso para: ${testEmail}`);
        res.json({ success: true, message: `Email de teste enviado com sucesso para ${testEmail}` });
      } else {
        console.error(`Falha ao enviar email de teste para: ${testEmail}`);
        res.status(500).json({ success: false, message: "Falha ao enviar email de teste" });
      }
    } catch (error) {
      console.error("Erro ao enviar email de teste:", error);
      console.error("Detalhes do erro:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        success: false, 
        message: "Falha ao enviar email de teste",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para testar o email de nova solicitação de frete
  app.post("/api/test/send-freight-request-email", async (req, res) => {
    try {
      const { email, name, requestId, clientName, freightDetails } = req.body;
      
      if (!email || !name) {
        return res.status(400).json({ 
          success: false, 
          message: "Parâmetros obrigatórios: email e name" 
        });
      }
      
      console.log(`Iniciando teste de email de nova solicitação para: ${email}`);
      
      const result = await sendNewFreightRequestEmail(
        email,
        name,
        requestId || 12345, // Usa o ID fornecido ou um valor padrão
        clientName || "Cliente Teste", // Usa o nome fornecido ou um valor padrão
        freightDetails || `
          <ul>
            <li><strong>Origem:</strong> São Paulo, SP</li>
            <li><strong>Destino:</strong> Rio de Janeiro, RJ</li>
            <li><strong>Tipo de carga:</strong> Carga Geral</li>
            <li><strong>Peso:</strong> 500 kg</li>
            <li><strong>Volume:</strong> 2 m³</li>
            <li><strong>Valor da Nota Fiscal:</strong> R$ 5.000,00</li>
            <li><strong>Data de Coleta:</strong> 25/03/2025</li>
            <li><strong>Data de Entrega:</strong> 27/03/2025</li>
          </ul>
        `
      );
      
      if (result) {
        console.log(`Email de nova solicitação enviado com sucesso para: ${email}`);
        res.json({ 
          success: true, 
          message: `Email de nova solicitação enviado com sucesso para ${email}` 
        });
      } else {
        console.error(`Falha ao enviar email de nova solicitação para: ${email}`);
        res.status(500).json({ 
          success: false, 
          message: "Falha ao enviar email de nova solicitação" 
        });
      }
    } catch (error) {
      console.error("Erro ao enviar email de nova solicitação:", error);
      res.status(500).json({ 
        success: false, 
        message: "Falha ao enviar email de nova solicitação",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint para buscar informações de um CNPJ
  app.get("/api/cnpj/:cnpj", async (req, res) => {
    try {
      const { cnpj } = req.params;
      
      if (!cnpj) {
        return res.status(400).json({ 
          success: false, 
          message: "CNPJ é obrigatório" 
        });
      }
      
      // Remover caracteres não numéricos do CNPJ
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      
      // Validar o CNPJ
      if (!validateCNPJ(cleanCNPJ)) {
        return res.status(400).json({ 
          success: false, 
          message: "CNPJ inválido" 
        });
      }
      
      log(`Buscando dados do CNPJ: ${cleanCNPJ}`, 'cnpj-service');
      
      const cnpjData = await fetchCNPJData(cleanCNPJ);
      
      if (!cnpjData) {
        return res.status(404).json({ 
          success: false, 
          message: "Não foi possível encontrar dados para este CNPJ" 
        });
      }
      
      if (cnpjData.error) {
        return res.status(404).json({ 
          success: false, 
          message: cnpjData.error 
        });
      }
      
      // Formatar o endereço completo
      const formattedAddress = formatAddress(cnpjData);
      
      return res.json({
        success: true,
        data: {
          ...cnpjData,
          formattedAddress
        }
      });
    } catch (error) {
      log(`Erro ao buscar CNPJ: ${error}`, 'cnpj-service');
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao processar a requisição",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Error handler for Zod validation errors
  const handleZodError = (error: unknown, res: Response) => {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  };

  // Middleware to check if user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Middleware to check if user is a client
  const ensureClient = (req: Request, res: Response, next: NextFunction) => {
    console.log("User in ensureClient:", req.user);
    console.log("Is authenticated:", req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized: Please log in" });
    }
    
    if (req.user?.role !== "client") {
      return res.status(403).json({ message: `Forbidden: Client access required. Current role: ${req.user?.role || 'undefined'}` });
    }
    
    return next();
  };

  // Middleware to check if user is a company
  const ensureCompany = (req: Request, res: Response, next: NextFunction) => {
    console.log("User in ensureCompany:", req.user);
    console.log("Is authenticated:", req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized: Please log in" });
    }
    
    if (req.user?.role !== "company") {
      return res.status(403).json({ message: `Forbidden: Company access required. Current role: ${req.user?.role || 'undefined'}` });
    }
    
    return next();
  };

  // Create a freight request (client only)
  app.post("/api/requests", ensureClient, async (req, res) => {
    try {
      // req.user é garantido existir pelo middleware ensureClient
      const userId = req.user!.id;
      
      console.log("Corpo da requisição recebido:", req.body);
      
      try {
        const requestData = insertFreightRequestSchema.parse({
          ...req.body,
          userId
        });
        console.log("Dados validados:", requestData);
        
        const freightRequest = await storage.createFreightRequest(requestData);
        console.log("Solicitação criada:", freightRequest);
        
        // Enviar notificação para empresas sobre nova solicitação
        // Buscando usuários que são empresas para notificá-los
        const allUsers = await storage.getAllUsers();
        const companyUsers = allUsers.filter(user => user.role === "company");
        if (companyUsers.length > 0) {
          // Usar o nome completo do cliente para a notificação
          const clientName = req.user!.fullName || req.user!.username;
          
          // Preparar detalhes do frete para o email
          const freightDetails = `
            <ul>
              <li><strong>Origem:</strong> ${requestData.originCity}, ${requestData.originState}</li>
              <li><strong>Destino:</strong> ${requestData.destinationCity}, ${requestData.destinationState}</li>
              <li><strong>Tipo de Carga:</strong> ${requestData.cargoType}</li>
              <li><strong>Peso:</strong> ${requestData.weight} kg</li>
              <li><strong>Valor da Nota Fiscal:</strong> R$ ${requestData.invoiceValue.toFixed(2)}</li>
              <li><strong>Data de Coleta:</strong> ${requestData.pickupDate}</li>
              <li><strong>Data de Entrega:</strong> ${requestData.deliveryDate}</li>
            </ul>
          `;
          
          // Notificar cada empresa via notificação in-app e e-mail
          for (const companyUser of companyUsers) {
            log(`Notificando empresa: ${companyUser.id} - ${companyUser.fullName}`, 'freight-notification');
            
            // Notificação in-app e email (agora usando o Gmail)
            sendNewFreightRequestNotification(
              companyUser.id,
              freightRequest.id, 
              clientName,
              freightDetails
            );
            
            // Funcionalidade de notificação por WhatsApp e SMS removida conforme solicitação do cliente
            // Apenas notificações por email e in-app estão sendo usadas
          }
        }
        
        res.status(201).json(freightRequest);
      } catch (validationError) {
        console.error("Erro de validação:", validationError);
        if (validationError instanceof ZodError) {
          const validationMessage = fromZodError(validationError);
          return res.status(400).json({ message: validationMessage.message });
        }
        throw validationError; // Repassa o erro para o tratamento global
      }
    } catch (error) {
      console.error("Erro ao criar solicitação de frete:", error);
      res.status(500).json({ message: "Erro interno do servidor ao criar solicitação", details: String(error) });
    }
  });

  // Get all freight requests for the logged-in client
  app.get("/api/requests", ensureClient, async (req, res) => {
    // req.user é garantido existir pelo middleware ensureClient
    const userId = req.user!.id;
    const requests = await storage.getFreightRequestsByUserId(userId);
    res.json(requests);
  });
  
  // Get active requests (in progress) for logged-in client
  app.get("/api/client/active-requests", ensureClient, async (req, res) => {
    const allRequests = await storage.getFreightRequestsByUserId(req.user!.id);
    const activeRequests = allRequests.filter(request => request.status === "accepted");
    res.json(activeRequests);
  });
  
  // Get completed requests for logged-in client
  app.get("/api/client/completed-requests", ensureClient, async (req, res) => {
    const allRequests = await storage.getFreightRequestsByUserId(req.user!.id);
    const completedRequests = allRequests.filter(request => request.status === "completed");
    res.json(completedRequests);
  });
  
  // Rotas adicionais sem o prefixo "client" para compatibilidade
  
  // Get pending requests (includes both pending and quoted)
  app.get("/api/pending-requests", ensureClient, async (req, res) => {
    const allRequests = await storage.getFreightRequestsByUserId(req.user!.id);
    const pendingRequests = allRequests.filter(request => 
      request.status === "pending" || request.status === "quoted"
    );
    res.json(pendingRequests);
  });
  
  // Get active requests (in progress)
  app.get("/api/active-requests", ensureClient, async (req, res) => {
    const allRequests = await storage.getFreightRequestsByUserId(req.user!.id);
    const activeRequests = allRequests.filter(request => request.status === "accepted");
    res.json(activeRequests);
  });
  
  // Get completed requests
  app.get("/api/completed-requests", ensureClient, async (req, res) => {
    const allRequests = await storage.getFreightRequestsByUserId(req.user!.id);
    const completedRequests = allRequests.filter(request => request.status === "completed");
    res.json(completedRequests);
  });

  // Get freight request details
  app.get("/api/requests/:id", ensureAuthenticated, async (req, res) => {
    const requestId = parseInt(req.params.id);
    
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    
    const request = await storage.getFreightRequestById(requestId);
    
    // Log da resposta para debug
    console.log("REQUEST DETAILS:", JSON.stringify(request, null, 2));
    
    if (!request) {
      return res.status(404).json({ message: "Freight request not found" });
    }
    
    // req.user é garantido existir pelo middleware ensureAuthenticated
    // Check if the user has access to this request
    if (req.user!.role === "client" && request.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have access to this request" });
    }
    
    res.json(request);
  });

  // Get pending freight requests (company only)
  app.get("/api/company/pending-requests", ensureCompany, async (req, res) => {
    const requests = await storage.getPendingFreightRequests();
    res.json(requests);
  });

  // Get active freight requests (company only)
  app.get("/api/company/active-requests", ensureCompany, async (req, res) => {
    const requests = await storage.getActiveFreightRequests();
    res.json(requests);
  });
  
  // Get completed freight requests (company only)
  app.get("/api/company/completed-requests", ensureCompany, async (req, res) => {
    const requests = await storage.getCompletedFreightRequests();
    res.json(requests);
  });

  // Create a quote for a freight request (company only)
  app.post("/api/quotes", ensureCompany, async (req, res) => {
    try {
      // Modificar o schema para permitir campos opcionais
      const modifiedSchema = insertQuoteSchema.extend({
        value: z.number().min(0),
        estimatedDays: z.number().min(1),
      });
      
      const quoteData = modifiedSchema.parse(req.body);
      
      // Check if the request exists
      const request = await storage.getFreightRequestById(quoteData.requestId);
      if (!request) {
        return res.status(404).json({ message: "Freight request not found" });
      }
      
      // Check if the request status is pending
      if (request.status !== "pending") {
        return res.status(400).json({ message: "This request already has a quote or has been processed" });
      }
      
      const quote = await storage.createQuote(quoteData);
      
      // Após criar a cotação, atualizamos o status da solicitação para "quoted"
      const updatedRequest = await storage.updateFreightRequestStatus(quoteData.requestId, "quoted");
      
      // Enviamos notificação ao cliente
      if (updatedRequest) {
        sendQuoteNotification(updatedRequest.userId, quoteData.requestId, quoteData.value);
      }
      
      res.status(201).json(quote);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Update freight request status (client only)
  app.patch("/api/requests/:id/status", ensureClient, async (req, res) => {
    const requestId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    
    if (!status || !["accepted", "rejected"].includes(status as string)) {
      return res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'rejected'" });
    }
    
    // Check if the request exists and belongs to the user
    const request = await storage.getFreightRequestById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Freight request not found" });
    }
    
    // req.user é garantido existir pelo middleware ensureClient
    if (request.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have access to this request" });
    }
    
    // Check if the current status is "quoted"
    if (request.status !== "quoted") {
      return res.status(400).json({ message: "This request cannot be accepted or rejected in its current state" });
    }
    
    const updatedRequest = await storage.updateFreightRequestStatus(requestId, status);
    
    // Enviar notificação de atualização de status
    if (updatedRequest) {
      sendStatusUpdateNotification(updatedRequest.userId, requestId, status);
    }
    
    res.json(updatedRequest);
  });

  // Update freight request status to completed (company only)
  app.patch("/api/company/requests/:id/complete", ensureCompany, async (req, res) => {
    const requestId = parseInt(req.params.id);
    
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    
    // Check if the request exists
    const request = await storage.getFreightRequestById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Freight request not found" });
    }
    
    // Check if the current status is "accepted"
    if (request.status !== "accepted") {
      return res.status(400).json({ message: "Only accepted requests can be marked as completed" });
    }
    
    const updatedRequest = await storage.updateFreightRequestStatus(requestId, "completed");
    
    // Enviar notificação ao cliente sobre conclusão do frete
    if (updatedRequest) {
      sendStatusUpdateNotification(updatedRequest.userId, requestId, "completed");
    }
    
    res.json(updatedRequest);
  });
  
  // Create a client account (company only)
  app.post("/api/company/clients", ensureCompany, async (req, res, next) => {
    try {
      console.log("Criando cliente com dados:", { ...req.body, password: '***' });
      
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      try {
        // Force the role to be client
        const userData = insertUserSchema.parse({
          ...req.body,
          role: "client" // Garantir que a role seja sempre "client"
        });
        
        console.log("Dados validados:", { ...userData, password: '***' });
        
        try {
          // Usamos o hashPassword importado no topo do arquivo
          const hashedPassword = await hashPassword(userData.password);
          console.log("Senha hash gerada com sucesso");
          
          try {
            const user = await storage.createUser({
              ...userData,
              password: hashedPassword,
            });
            
            console.log("Usuário criado com sucesso:", { id: user.id, username: user.username });

            // Remove password from response
            const { password, ...userWithoutPassword } = user;
            res.status(201).json(userWithoutPassword);
          } catch (error: any) {
            console.error("Erro ao criar usuário no storage:", error);
            res.status(500).json({ message: `Erro ao criar usuário: ${error.message}` });
          }
        } catch (error: any) {
          console.error("Erro ao fazer hash da senha:", error);
          res.status(500).json({ message: `Erro ao processar senha: ${error.message}` });
        }
      } catch (error) {
        console.error("Erro de validação:", error);
        handleZodError(error, res);
      }
    } catch (error: any) {
      console.error("Erro geral na criação do cliente:", error);
      res.status(500).json({ message: `Erro interno do servidor: ${error.message}` });
    }
  });
  
  // Get all clients (company only)
  app.get("/api/company/clients", ensureCompany, async (req, res) => {
    try {
      const allClients = await storage.getAllClients();
      // Remove passwords before sending
      const clientsWithoutPasswords = allClients.map(client => {
        const { password, ...clientWithoutPassword } = client;
        return clientWithoutPassword;
      });
      
      res.json(clientsWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  });
  
  // Get specific user by ID (company only)
  app.get("/api/users/:id", ensureCompany, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Remove password before sending
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });
  
  // Get all requests for a specific client (company only)
  app.get("/api/client/:id/requests", ensureCompany, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID de cliente inválido" });
      }
      
      // Verifica se o usuário existe e é um cliente
      const user = await storage.getUser(clientId);
      if (!user) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      if (user.role !== "client") {
        return res.status(403).json({ message: "O usuário especificado não é um cliente" });
      }
      
      const requests = await storage.getFreightRequestsByUserId(clientId);
      res.json(requests);
    } catch (error) {
      console.error("Erro ao buscar solicitações do cliente:", error);
      res.status(500).json({ message: "Erro ao buscar solicitações do cliente" });
    }
  });
  
  // Delete client (company only)
  app.delete("/api/company/clients/:id", ensureCompany, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Verifica se o usuário existe e é um cliente
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      if (user.role !== "client") {
        return res.status(403).json({ message: "Somente clientes podem ser excluídos" });
      }
      
      const deleted = await storage.deleteUser(userId);
      if (deleted) {
        res.status(200).json({ message: "Cliente excluído com sucesso" });
      } else {
        res.status(500).json({ message: "Erro ao excluir cliente" });
      }
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      res.status(500).json({ message: "Erro interno ao excluir cliente" });
    }
  });

  // API para gerenciamento de notificações

  // Get notifications for logged in user
  app.get("/api/notifications", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await storage.getNotificationsByUserId(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar notificações" });
    }
  });

  // Get unread notifications count
  app.get("/api/notifications/count", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationsCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Erro ao contar notificações não lidas" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", ensureAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "ID de notificação inválido" });
      }
      
      const notification = await storage.markNotificationAsRead(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notificação não encontrada" });
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Erro ao marcar notificação como lida" });
    }
  });
  
  // Mark all notifications as read for a user
  app.patch("/api/notifications/mark-all-read", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const updatedCount = await storage.markAllNotificationsAsRead(userId);
      
      res.json({ success: true, count: updatedCount });
    } catch (error) {
      res.status(500).json({ message: "Erro ao marcar todas notificações como lidas" });
    }
  });
  
  // Mark freight request as completed (company only)
  app.patch("/api/company/requests/:id/complete", ensureCompany, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "ID de solicitação inválido" });
      }
      
      // Verificar se a solicitação existe
      const request = await storage.getFreightRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }
      
      // Verificar se a solicitação está aceita (status "accepted")
      if (request.status !== "accepted") {
        return res.status(400).json({ message: "Apenas solicitações aceitas podem ser marcadas como concluídas" });
      }
      
      // Verificar se tem comprovante de entrega
      const proof = await storage.getDeliveryProofByRequestId(requestId);
      if (!proof) {
        return res.status(400).json({ message: "É necessário anexar um comprovante de entrega antes de concluir a solicitação" });
      }
      
      // Atualizar o status para "completed"
      const updatedRequest = await storage.updateFreightRequestStatus(requestId, "completed");
      
      // Notificar o cliente
      await storage.createNotification({
        userId: request.userId,
        requestId: requestId,
        type: "status_update",
        message: "Seu frete foi marcado como concluído pela transportadora.",
        read: false
      });
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Erro ao concluir solicitação:", error);
      res.status(500).json({ message: "Erro ao concluir a solicitação" });
    }
  });

  // API para gerenciamento de comprovantes de entrega

  // Upload delivery proof (company only)
  app.post("/api/delivery-proofs", ensureCompany, async (req, res) => {
    try {
      const proofData = insertDeliveryProofSchema.parse(req.body);
      
      // Check if the request exists
      const request = await storage.getFreightRequestById(proofData.requestId);
      if (!request) {
        return res.status(404).json({ message: "Solicitação de frete não encontrada" });
      }
      
      // Verificar se a requisição tem status "accepted"
      console.log("Status da requisição:", request.status);
      
      // Check if the current status is accepted
      if (request.status !== "accepted") {
        return res.status(400).json({ message: "Apenas solicitações aceitas podem receber comprovantes de entrega" });
      }
      
      // Check if proof already exists
      const existingProof = await storage.getDeliveryProofByRequestId(proofData.requestId);
      if (existingProof) {
        return res.status(400).json({ message: "Esta solicitação já possui um comprovante de entrega" });
      }
      
      const proof = await storage.createDeliveryProof(proofData);
      
      // Atualizar status da solicitação para "completed" e definir completedAt
      const updatedRequest = await storage.updateFreightRequestStatus(proofData.requestId, "completed");
      
      // Notificar o cliente que um comprovante foi enviado e que a solicitação foi concluída
      sendDeliveryProofNotification(request.userId, proofData.requestId);
      sendStatusUpdateNotification(request.userId, proofData.requestId, "completed");
      
      res.status(201).json({ proof, requestUpdated: !!updatedRequest });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Get delivery proof by request ID
  app.get("/api/requests/:id/delivery-proof", ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "ID de solicitação inválido" });
      }
      
      // Check if the request exists
      const request = await storage.getFreightRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Solicitação de frete não encontrada" });
      }
      
      // If user is client, check if it belongs to them
      if (req.user!.role === "client" && request.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem acesso a esta solicitação" });
      }
      
      const proof = await storage.getDeliveryProofByRequestId(requestId);
      if (!proof) {
        return res.status(404).json({ message: "Comprovante de entrega não encontrado" });
      }
      
      res.json(proof);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar comprovante de entrega" });
    }
  });


  
  // Serviço de Email para notificações
  app.post("/api/send-email", ensureAuthenticated, async (req, res) => {
    try {
      const { to, subject, text, html } = req.body;
      
      // Verifica permissões - apenas usuários da empresa podem enviar emails
      if (req.user!.role !== "company") {
        return res.status(403).json({ message: "Apenas usuários da empresa podem enviar emails" });
      }
      
      // Verifica campos obrigatórios
      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ message: "Campos obrigatórios: to, subject e (text ou html)" });
      }
      
      // Usa o novo serviço de email
      const result = await sendEmail({
        to,
        subject,
        text: text || '',
        html: html || ''
      });
      
      if (result) {
        res.status(200).json({ message: "Email enviado com sucesso" });
      } else {
        res.status(500).json({ message: "Falha ao enviar email" });
      }
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      res.status(500).json({ message: "Erro ao enviar email" });
    }
  });
  
  // Temporário: Atualizar registros de fretes concluídos com data de conclusão
  app.get("/api/update-completed-dates", ensureCompany, async (req, res) => {
    try {
      const completedRequests = await db
        .select()
        .from(freightRequests)
        .where(eq(freightRequests.status, "completed"));
      
      const today = new Date();
      let updatedCount = 0;
      
      for (const request of completedRequests) {
        if (!request.completedAt) {
          await db
            .update(freightRequests)
            .set({ completedAt: today })
            .where(eq(freightRequests.id, request.id));
          updatedCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `Atualizado ${updatedCount} registro(s) de fretes concluídos com a data de hoje.` 
      });
    } catch (error) {
      console.error("Erro ao atualizar datas de conclusão:", error);
      res.status(500).json({ message: "Erro ao atualizar datas de conclusão" });
    }
  });

  // Endpoint para gerar relatório de fretes de um cliente em PDF
  app.get("/api/report/client/:id", ensureAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID de cliente inválido" });
      }

      // Obter cliente
      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      // Verificar se o usuário logado é o próprio cliente ou uma empresa (que pode ver relatórios de qualquer cliente)
      if (req.user?.id !== clientId && req.user?.role !== 'company') {
        return res.status(403).json({ message: "Acesso não autorizado ao relatório" });
      }

      // Obter todos os fretes do cliente
      const requests = await storage.getFreightRequestsByUserId(clientId);
      
      // Verificar período específico para o relatório
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ message: "Datas inválidas" });
        }
      }
      
      // Importar o serviço de PDF
      const { generateClientFreightReport } = await import('./services/html-report');
      
      // Gerar o PDF
      const pdfBuffer = await generateClientFreightReport(
        client.fullName, 
        requests,
        startDate,
        endDate
      );
      
      // Enviar o PDF como resposta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_${client.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      res.status(500).json({ message: "Erro ao gerar relatório" });
    }
  });

  // Endpoint para gerar relatório mensal de fretes de um cliente em PDF
  app.get("/api/report/client/:id/monthly/:month/:year", ensureAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      
      if (isNaN(clientId) || isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Parâmetros inválidos" });
      }

      // Obter cliente
      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      // Verificar se o usuário logado é o próprio cliente ou uma empresa (que pode ver relatórios de qualquer cliente)
      if (req.user?.id !== clientId && req.user?.role !== 'company') {
        return res.status(403).json({ message: "Acesso não autorizado ao relatório" });
      }

      // Obter todos os fretes do cliente
      const requests = await storage.getFreightRequestsByUserId(clientId);
      
      // Definir o período do mês
      const startDate = new Date(year, month - 1, 1); // Mês em JavaScript é 0-indexed
      const endDate = new Date(year, month, 0); // Último dia do mês
      
      // Importar o serviço de PDF
      const { generateClientFreightReport } = await import('./services/html-report');
      
      // Gerar o PDF
      const pdfBuffer = await generateClientFreightReport(
        client.fullName, 
        requests,
        startDate,
        endDate
      );
      
      // Enviar o PDF como resposta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_mensal_${client.fullName.replace(/\s+/g, '_')}_${month}_${year}.pdf`);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Erro ao gerar relatório mensal:", error);
      res.status(500).json({ message: "Erro ao gerar relatório mensal" });
    }
  });

  // Rota de teste para enviar email
  app.get("/api/test-email", async (req, res) => {
    try {
      console.log("Iniciando teste de envio de email para pedroxxsb@gmail.com");
      
      const to = 'pedroxxsb@gmail.com';
      console.log(`Tentando enviar email de teste para ${to}`);
      
      const result = await sendEmail({
        to: to,
        subject: 'Teste de Email do LogMene',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2E3192;">Teste de Email do LogMene</h2>
            <p>Este é um email de teste do sistema LogMene.</p>
            <p>Se você recebeu este email, significa que a integração com o serviço de email está funcionando corretamente.</p>
            <p>Data e hora do envio: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        `
      });
      
      if (result) {
        console.log("Email de teste enviado com sucesso");
        res.json({ 
          success: true, 
          message: 'Email enviado com sucesso!', 
          details: 'Verifique os logs do servidor para mais informações sobre o envio.'
        });
      } else {
        console.log("Falha ao enviar email de teste");
        res.status(500).json({ success: false, message: 'Falha ao enviar email' });
      }
    } catch (error) {
      console.error('Erro ao enviar email de teste:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao enviar email', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  const httpServer = createServer(app);
  // Rota para testar o MailerSend com debug aprimorado
  app.get('/api/test/notification-fallback', async (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email é obrigatório' });
    }
    
    try {
      console.log(`==== TESTE DE EMAIL - INICIANDO ====`);
      console.log(`Destinatário: ${email}`);
      console.log(`Serviço: MailerSend`);
      console.log(`Data/Hora: ${new Date().toISOString()}`);
      console.log(`===============================`);
      
      try {
        // Importar diretamente do serviço de MailerSend
        const { sendEmail } = await import('./services/mailersend-service');
        
        console.log('Enviando email via MailerSend...');
        const result = await sendEmail({
          to: email,
          subject: 'Teste de Email do Sistema LogMene',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
                <h2>LogMene - Teste do Serviço de Email</h2>
              </div>
              <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
                <p>Este é um email de teste do Sistema LogMene.</p>
                <p>Se você está recebendo este email, o serviço de email está funcionando corretamente!</p>
                <p>Data e hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
              </div>
              <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
                <p>Este é um email automático de teste, por favor não responda.</p>
                <p>&copy; ${new Date().getFullYear()} LogMene. Todos os direitos reservados.</p>
              </div>
            </div>
          `
        });
        
        if (result) {
          return res.json({ 
            success: true, 
            message: `Teste de email concluído com sucesso. Email enviado via MailerSend.`,
            details: {
              to: email
            }
          });
        } else {
          return res.status(500).json({ 
            success: false, 
            message: `Falha ao enviar email via MailerSend.`
          });
        }
      } catch (emailError) {
        console.error('Erro detalhado ao enviar email:', emailError);
        
        // Formatando para resposta mais legível
        let errorDetails: Record<string, any> = {
          message: emailError instanceof Error ? emailError.message : 'Erro desconhecido'
        };
        
        // Extrair informações específicas do MailerSend
        if ((emailError as any).body) {
          errorDetails.api_response = (emailError as any).body;
          errorDetails.status_code = (emailError as any).statusCode;
        }
        
        return res.status(500).json({ 
          success: false, 
          message: `Falha ao enviar email via MailerSend. ${errorDetails.message}`,
          error_details: errorDetails
        });
      }
    } catch (error) {
      console.error('Erro no teste de email:', error);
      return res.status(500).json({ 
        success: false, 
        message: `Erro ao testar serviço de email: ${error}`,
        error: String(error)
      });
    }
  });
  
  // Funcionalidade de envio de WhatsApp removida conforme solicitação do cliente
  
  // Rota simplificada para testar o serviço MailerSend (direta, sem formatação)
  app.get('/api/test/mailersend', async (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email é obrigatório' });
    }
    
    try {
      console.log(`==== TESTE DIRETO MAILERSEND ====`);
      console.log(`Email: ${email}`);
      
      if (!process.env.MAILERSEND_API_KEY) {
        return res.status(500).json({ 
          success: false, 
          message: 'MAILERSEND_API_KEY não configurada no ambiente'
        });
      }
      
      // Usando o approach de API direta via axios
      
      // Mostrar chave parcial (apenas primeiros e últimos caracteres)
      const apiKey = process.env.MAILERSEND_API_KEY;
      const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
      console.log(`Usando chave API: ${maskedKey}`);
      
      // Dados da requisição
      const apiUrl = 'https://api.mailersend.com/v1/email';
      const requestData = {
        from: {
          email: 'no-reply@mailersend.net', // Email que não requer validação de domínio
          name: 'LogMene Teste Direto'
        },
        to: [{ email }],
        subject: 'Teste Direto MailerSend',
        text: 'Este é um teste direto do serviço MailerSend. Hora: ' + new Date().toISOString(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
              <h2>LogMene - Teste Direto API</h2>
            </div>
            <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
              <p>Este é um teste direto da <strong>API do MailerSend</strong>.</p>
              <p>Email enviado para: <strong>${email}</strong></p>
              <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
              <p>Este é um email automático de teste, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} LogMene</p>
            </div>
          </div>
        `
      };
      
      console.log('Enviando email de teste via API direta...');
      
      try {
        // Import axios dynamically to avoid issues with loading the module
        const axios = (await import('axios')).default;
        const response = await axios.post(apiUrl, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        console.log('Resposta do MailerSend:', response.data);
        
        return res.json({
          success: true,
          message: 'Email enviado com sucesso via teste direto',
          details: {
            to: email,
            response: response.data
          }
        });
      } catch (apiError) {
        console.error('Erro na API do MailerSend:', apiError);
        
        let errorDetails: Record<string, any> = { message: 'Erro desconhecido' };
        if (apiError instanceof Error) {
          errorDetails.message = apiError.message;
        }
        
        if ((apiError as any).response) {
          errorDetails.api_response = (apiError as any).response.data;
          errorDetails.status_code = (apiError as any).response.status;
        }
        
        return res.status(500).json({
          success: false,
          message: 'Falha ao enviar email no teste direto',
          error_details: errorDetails
        });
      }
    } catch (error) {
      console.error('Erro ao inicializar teste direto:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao configurar teste direto do MailerSend',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Rota para testar o serviço SMTP do MailerSend
  app.get('/api/test/smtp', async (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email é obrigatório' });
    }
    
    try {
      console.log(`==== TESTE SMTP MAILERSEND ====`);
      console.log(`Email: ${email}`);
      
      const { sendEmailViaSMTP } = await import('./services/mailersend-smtp-service');
      
      const result = await sendEmailViaSMTP({
        to: email,
        subject: 'Teste SMTP do LogMene',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
              <h2>LogMene - Teste SMTP</h2>
            </div>
            <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
              <p>Este é um teste do serviço <strong>SMTP do MailerSend</strong>.</p>
              <p>Email enviado para: <strong>${email}</strong></p>
              <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
              <p>Este é um email automático de teste, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} LogMene</p>
            </div>
          </div>
        `
      });
      
      if (result) {
        return res.json({
          success: true,
          message: 'Email enviado com sucesso via SMTP',
          details: { 
            to: email,
            method: 'SMTP MailerSend'
          }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Falha ao enviar email via SMTP'
        });
      }
    } catch (error) {
      console.error('Erro ao testar SMTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao configurar teste SMTP do MailerSend',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para testar o mecanismo de fallback de email para domínios não verificados
  app.get('/api/test/notification-fallback', async (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email é obrigatório' });
    }
    
    try {
      console.log(`==== TESTE FALLBACK EMAIL ====`);
      console.log(`Email: ${email}`);
      
      // Teste especial para verificar o mecanismo de fallback
      // Forçar um email que precisaria de fallback (não verificado no MailerSend)
      const { sendEmailViaSMTP } = await import('./services/mailersend-smtp-service');
      
      const result = await sendEmailViaSMTP({
        to: email,
        subject: 'Teste do Mecanismo de Fallback - LogMene',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
              <h2>LogMene - Teste de Fallback</h2>
            </div>
            <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
              <p>Este é um teste do mecanismo de <strong>fallback para domínios não verificados</strong>.</p>
              <p>Email original: <strong>${email}</strong></p>
              <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>
        `
      });
      
      if (result) {
        return res.json({
          success: true,
          message: 'Teste de fallback executado com sucesso',
          details: { 
            to: email,
            note: 'Se este é um domínio não verificado pelo MailerSend, o email deve ter sido redirecionado para o endereço de fallback com uma nota adicional.'
          }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Falha ao testar mecanismo de fallback'
        });
      }
    } catch (error) {
      console.error('Erro ao testar fallback:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao testar mecanismo de fallback',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para testar o serviço de notificações
  app.post('/api/test/notification', async (req, res) => {
    const { userId, requestId, type, message, sendEmail } = req.body;
    
    if (!userId || !type || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dados incompletos. userId, type e message são obrigatórios.'
      });
    }
    
    try {
      log(`Testando serviço de notificação para usuário ${userId} (tipo: ${type})`, 'notification-test');
      
      const { sendNotification } = await import('./services/notification-service');
      
      // Verificar se o usuário existe
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: `Usuário com ID ${userId} não encontrado`
        });
      }
      
      log(`Canal de envio: email=${!!sendEmail}`, 'notification-test');
      log(`Dados do usuário: email=${user.email}`, 'notification-test');
      
      // Enviar notificação usando o serviço
      const result = await sendNotification({
        userId,
        requestId: requestId || null,
        type,
        message,
        sendEmail: sendEmail !== false
      });
      
      if (result) {
        // Buscar a notificação criada para confirmar
        const notifications = await storage.getNotificationsByUserId(userId);
        const lastNotification = notifications.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
          return dateB.getTime() - dateA.getTime();
        })[0];
        
        return res.json({ 
          success: true, 
          message: `Notificação enviada com sucesso para ${user.username}`,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role
          },
          notification: lastNotification,
          channels: {
            inApp: true,
            email: sendEmail !== false && !!user.email
          }
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          message: 'Falha ao enviar notificação'
        });
      }
    } catch (error) {
      console.error('Erro ao testar serviço de notificação:', error);
      return res.status(500).json({ 
        success: false, 
        message: `Erro ao testar serviço de notificação: ${error}`,
        error: String(error)
      });
    }
  });

  // Recurso de notificação por WhatsApp removido conforme solicitação do cliente
  
  // Rota principal para testar serviço de email
  app.get('/api/test/send-email', async (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email é obrigatório' });
    }
    
    try {
      console.log(`==== TESTE EMAIL STANDARD ====`);
      console.log(`Email: ${email}`);
      
      // Importar o módulo emailService
      const emailModule = await import('./services/email-service');
      
      const result = await emailModule.sendEmail({
        to: email,
        from: 'LogMene <no-reply@logmene.com.br>',
        subject: 'Teste de Email - LogMene',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
              <h2>LogMene - Teste de Email</h2>
            </div>
            <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
              <p>Este é um teste do serviço padrão de email.</p>
              <p>Email enviado para: <strong>${email}</strong></p>
              <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
              <p>Este é um email automático de teste, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} LogMene</p>
            </div>
          </div>
        `
      });
      
      if (result) {
        return res.json({
          success: true,
          message: 'Email enviado com sucesso',
          details: { 
            to: email,
            method: 'Standard Email Service'
          }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Falha ao enviar email'
        });
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar email',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return httpServer;
}
