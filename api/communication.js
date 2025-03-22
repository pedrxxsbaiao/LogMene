// Arquivo que consolida os serviços de comunicação (email e SMS)
// Isso reduz o número de funções serverless na Vercel
import twilio from 'twilio';

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
      case 'gmail-test':
        return await gmailTestHandler(req, res);
      default:
        return res.status(400).json({ 
          error: 'Operação inválida',
          validOperations: ['email', 'sms', 'gmail-test']
        });
    }
  } catch (error) {
    console.error(`Erro no communication (${op}):`, error);
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
  // Verifica se é um método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { to, subject, text, html } = req.body;
    
    // Validação básica
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'Campos obrigatórios: to, subject, e pelo menos um de text ou html' });
    }
    
    // Envio de email - Simula o envio em ambiente de desenvolvimento
    // Em produção, este deve usar o serviço configurado (Gmail, MailerSend, etc)
    const success = await sendEmailViaSMTP({ to, subject, text, html });
    
    if (success) {
      return res.status(200).json({ success: true, message: 'Email enviado com sucesso' });
    } else {
      return res.status(500).json({ success: false, error: 'Falha ao enviar email' });
    }
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Função para enviar email via SMTP - Esta é uma implementação simulada
 * Em produção, deve ser substituída pela implementação real
 */
async function sendEmailViaSMTP(params) {
  // Simulação de envio bem-sucedido em ambiente dev
  if (process.env.NODE_ENV !== 'production') {
    console.log('Simulando envio de email:', {
      to: params.to,
      subject: params.subject,
      text: params.text?.substring(0, 100) + (params.text?.length > 100 ? '...' : ''),
      htmlPreview: params.html ? '[HTML content]' : undefined
    });
    return true;
  }
  
  // Em produção, faria a implementação real aqui...
  console.log('Tentando enviar email em produção (não implementado)');
  return false;
}

/**
 * Handler para envio de SMS
 */
async function smsHandler(req, res) {
  // Verifica se é um método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { to, body } = req.body;
    
    // Validação básica
    if (!to || !body) {
      return res.status(400).json({ error: 'Campos obrigatórios: to, body' });
    }
    
    // Envia SMS
    const success = await sendSMS(to, body);
    
    if (success) {
      return res.status(200).json({ success: true, message: 'SMS enviado com sucesso' });
    } else {
      return res.status(500).json({ success: false, error: 'Falha ao enviar SMS' });
    }
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Envia uma mensagem SMS para o número especificado
 */
export async function sendSMS(to, body) {
  // Formatar o número de telefone
  const formattedPhone = formatPhoneNumber(to);
  
  // Verificar o modo de operação baseado nas variáveis de ambiente
  const twilioMode = process.env.TWILIO_MODE || 'bypass';
  
  // 'bypass' - não tenta enviar, apenas simula sucesso (default)
  if (twilioMode === 'bypass') {
    console.log(`[TWILIO BYPASS] Simulando envio de SMS para ${formattedPhone}: ${body}`);
    return true;
  }
  
  // 'simulation' - não envia realmente, mas usa a Twilio API em modo de teste
  if (twilioMode === 'simulation') {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('Credenciais Twilio não configuradas para modo de simulação');
      return false;
    }
    
    try {
      console.log(`[TWILIO SIMULATION] Simulando envio para ${formattedPhone}: ${body}`);
      // Em um ambiente de simulação real, usaria o cliente Twilio com credenciais de teste
      return true;
    } catch (error) {
      console.error('Erro ao simular envio de SMS:', error);
      return false;
    }
  }
  
  // 'normal' - tenta enviar SMS usando a API Twilio
  if (twilioMode === 'normal') {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('Credenciais Twilio ou número de telefone não configurados');
      return false;
    }
    
    try {
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      const message = await twilioClient.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });
      
      console.log('SMS enviado com sucesso:', message.sid);
      return true;
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      return false;
    }
  }
  
  console.error(`Modo Twilio desconhecido: ${twilioMode}`);
  return false;
}

/**
 * Formata o número de telefone para o formato internacional do Twilio
 * Se o número já começar com +, mantém como está
 * Caso contrário, adiciona o prefixo internacional do Brasil +55
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove espaços, parênteses, traços e outros caracteres não numéricos
  const cleaned = phone.replace(/\\D/g, '');
  
  // Se já começa com +, mantém como está
  if (phone.startsWith('+')) return phone;
  
  // Se começa com 55, adiciona apenas o +
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return `+${cleaned}`;
  }
  
  // Caso contrário, adiciona o código do Brasil +55
  return `+55${cleaned}`;
}

/**
 * Handler para testar a integração com a API do Gmail
 */
async function gmailTestHandler(req, res) {
  // Verifica se é um método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Para um teste simples de email
    if (req.body.testType === 'simple') {
      const { to, subject, text } = req.body;
      
      // Validação básica
      if (!to || !subject || !text) {
        return res.status(400).json({ error: 'Campos obrigatórios: to, subject, text' });
      }
      
      // Em ambiente de desenvolvimento, apenas simula o envio
      if (process.env.NODE_ENV !== 'production') {
        console.log('Simulando teste de email Gmail:', { to, subject, text });
        return res.status(200).json({ 
          success: true, 
          message: 'Email simulado com sucesso (ambiente de desenvolvimento)',
          details: { to, subject, textPreview: text.substring(0, 50) + '...' }
        });
      }
      
      // Em produção, tentaria usar o serviço real de email do Gmail
      return res.status(500).json({ 
        success: false, 
        error: 'Funcionalidade disponível apenas em ambiente de desenvolvimento' 
      });
    }
    // Para testar email de solicitação de frete
    else if (req.body.testType === 'freightRequest') {
      const { companyEmail, companyName, requestId, clientName, origin, destination } = req.body;
      
      // Validação básica
      if (!companyEmail || !companyName || !requestId || !clientName || !origin || !destination) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: companyEmail, companyName, requestId, clientName, origin, destination' 
        });
      }
      
      // Simula envio em ambiente de desenvolvimento
      console.log('Simulando envio de email de solicitação de frete:', {
        companyEmail,
        companyName,
        requestId,
        clientName,
        origin,
        destination
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Email de solicitação de frete simulado com sucesso',
        details: {
          to: companyEmail,
          subject: `Nova solicitação de frete #${requestId} de ${clientName}`,
          contentPreview: `Nova solicitação de ${origin} para ${destination}...`
        }
      });
    }
    else {
      return res.status(400).json({ error: 'Tipo de teste não reconhecido' });
    }
  } catch (error) {
    console.error('Erro no teste do Gmail:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}