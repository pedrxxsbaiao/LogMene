// Arquivo que consolida os endpoints relacionados a comunicação
// Isso reduz o número de funções serverless na Vercel

// Dependências
import { sendEmail } from '../server/services/brevo-email-service.js';
import { sendSMS } from '../server/services/sms-service.js';
import { sendGmailEmail } from '../server/services/gmail-service.js';
import { sendNewFreightRequestEmail } from '../server/services/email-service.js';

/**
 * Handler principal que roteia as solicitações para as sub-funções apropriadas
 */
export default async function handler(req, res) {
  // Extrair o tipo de operação da consulta
  const { op } = req.query;
  
  try {
    switch (op) {
      case 'email':
        return await emailHandler(req, res);
      case 'sms':
        return await smsHandler(req, res);
      case 'gmail':
        return await gmailTestHandler(req, res);
      default:
        return res.status(400).json({ 
          error: 'Operação inválida',
          validOperations: ['email', 'sms', 'gmail']
        });
    }
  } catch (error) {
    console.error(`Erro em communication/${op}:`, error);
    return res.status(500).json({ 
      error: 'Erro interno no servidor',
      message: error.message
    });
  }
}

/**
 * Handler para envio de email
 */
async function emailHandler(req, res) {
  const method = req.method;
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  const { to, subject, text, html, type, companyEmail, companyName, requestId, clientName, freightDetails } = req.body;
  
  try {
    // Se for um email de notificação de nova solicitação de frete
    if (type === 'freight-request') {
      if (!companyEmail || !requestId) {
        return res.status(400).json({ error: 'Parâmetros inválidos' });
      }
      
      const sent = await sendNewFreightRequestEmail(
        companyEmail,
        companyName || 'Transportadora',
        requestId,
        clientName || 'Cliente',
        freightDetails
      );
      
      return res.status(sent ? 200 : 500).json({ 
        success: sent,
        message: sent ? 'Email enviado com sucesso' : 'Falha ao enviar email'
      });
    }
    
    // Email padrão
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }
    
    const sent = await sendEmailViaSMTP({
      to,
      subject,
      text,
      html
    });
    
    return res.status(sent ? 200 : 500).json({ 
      success: sent,
      message: sent ? 'Email enviado com sucesso' : 'Falha ao enviar email'
    });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao enviar email',
      message: error.message
    });
  }
}

/**
 * Função para enviar email via SMTP - Esta é uma implementação simulada
 * Em produção, deve ser substituída pela implementação real
 */
async function sendEmailViaSMTP(params) {
  try {
    return await sendEmail(params);
  } catch (error) {
    console.error('Erro ao enviar email via SMTP:', error);
    throw error;
  }
}

/**
 * Handler para envio de SMS
 */
async function smsHandler(req, res) {
  const method = req.method;
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  const { to, body } = req.body;
  
  if (!to || !body) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }
  
  try {
    const sent = await sendSMS(to, body);
    
    return res.status(sent ? 200 : 500).json({ 
      success: sent,
      message: sent ? 'SMS enviado com sucesso' : 'Falha ao enviar SMS'
    });
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao enviar SMS',
      message: error.message
    });
  }
}

/**
 * Envia uma mensagem SMS para o número especificado
 */
export async function sendSMS(to, body) {
  // Implementação mantida no serviço original
  throw new Error("Método movido para serviço específico");
}

/**
 * Formata o número de telefone para o formato internacional do Twilio
 * Se o número já começar com +, mantém como está
 * Caso contrário, adiciona o prefixo internacional do Brasil +55
 */
function formatPhoneNumber(phone) {
  if (phone.startsWith('+')) {
    return phone;
  }
  return `+55${phone}`;
}

/**
 * Handler para testar a integração com a API do Gmail
 */
async function gmailTestHandler(req, res) {
  const method = req.method;
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  const { to, subject, text, html } = req.body;
  
  if (!to || !subject) {
    return res.status(400).json({ error: 'Destinatário e assunto são obrigatórios' });
  }
  
  try {
    const sent = await sendGmailEmail({
      to,
      subject,
      text: text || '',
      html: html || ''
    });
    
    return res.status(sent ? 200 : 500).json({ 
      success: sent,
      message: sent ? 'Email enviado com sucesso via Gmail' : 'Falha ao enviar email'
    });
  } catch (error) {
    console.error('Erro ao enviar email via Gmail:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao enviar email via Gmail',
      message: error.message
    });
  }
}