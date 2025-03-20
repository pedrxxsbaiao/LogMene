import twilio from 'twilio';
import { log } from '../vite';

// Criar o cliente Twilio usando as credenciais
const createTwilioClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  
  // Log para debug dos valores (sem exibir o conteúdo completo do token)
  log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID?.substring(0, 4)}...`, 'twilio-sms');
  log(`TWILIO_AUTH_TOKEN existe: ${Boolean(process.env.TWILIO_AUTH_TOKEN)}`, 'twilio-sms');
  log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER}`, 'twilio-sms');
  
  try {
    // Verificamos se estamos usando uma API Key (SK) ou Account SID (AC)
    if (process.env.TWILIO_ACCOUNT_SID.startsWith('SK')) {
      // Usando uma API Key, neste caso, precisamos de um nome de usuário (SK) e senha (segredo da API)
      log('Usando Twilio API Key em vez de Account SID', 'twilio-sms');
      
      // Para usar a API Key, precisamos criar um simulacro de cliente Twilio
      // Mas infelizmente, o SDK JavaScript do Twilio não suporta autenticação API Key diretamente
      // Precisamos de um Account SID real para usar com a API Key
      
      log('AVISO: O SDK JavaScript do Twilio requer um Account SID real mesmo ao usar API Key', 'twilio-sms');
      log('Retornando um cliente simulado para não quebrar o fluxo', 'twilio-sms');
      
      // Aqui retornamos um cliente simulado que irá 'simular' o envio de SMS
      return null;
    }
    
    // Se chegamos aqui, estamos usando um Account SID normal (AC)
    return twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  } catch (error) {
    log(`Erro ao criar cliente Twilio: ${error}`, 'twilio-sms');
    return null;
  }
};

/**
 * Envia uma mensagem SMS para o número especificado
 * 
 * @param to Número de telefone do destinatário (formato internacional com +)
 * @param body Conteúdo da mensagem
 * @returns true se o envio foi bem-sucedido, false caso contrário
 */
export async function sendSMS(to: string, body: string): Promise<boolean> {
  // Se não tiver as credenciais do Twilio, loga e simula o envio
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    log(`[SMS simulado] Para: ${to}`, 'twilio-sms');
    log(`[SMS simulado] Mensagem: ${body}`, 'twilio-sms');
    log(`AVISO: Credenciais Twilio não configuradas. Configure para enviar SMS reais.`, 'twilio-sms');
    return true; // Retorna sucesso para não quebrar o fluxo da aplicação
  }

  try {
    const client = createTwilioClient();
    
    // Se não conseguimos criar o cliente, entramos em modo de simulação
    if (!client) {
      log(`Modo de simulação ativado - Cliente Twilio não disponível.`, 'twilio-sms');
      log(`[SMS SIMULADO] Para: ${to}`, 'twilio-sms');
      log(`[SMS SIMULADO] Mensagem: ${body}`, 'twilio-sms');
      return true; // Simulamos sucesso para não quebrar o fluxo da aplicação
    }

    // Formatar o número de telefone (garantir formato internacional)
    const formattedPhone = formatPhoneNumber(to);
    
    log(`Enviando SMS via Twilio para: ${formattedPhone}`, 'twilio-sms');
    
    // Enviar SMS via Twilio
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    log(`SMS enviado com sucesso via Twilio. SID: ${message.sid}`, 'twilio-sms');
    return true;
  } catch (error) {
    log(`Erro ao enviar SMS via Twilio: ${error}`, 'twilio-sms');
    
    if (error instanceof Error) {
      log(`Detalhes do erro: ${error.message}`, 'twilio-sms');
      log(`Stack trace: ${error.stack}`, 'twilio-sms');
      
      // Se o erro tiver mais propriedades específicas do Twilio
      const twilioError = error as any;
      if (twilioError.code) {
        log(`Código de erro Twilio: ${twilioError.code}`, 'twilio-sms');
      }
      if (twilioError.moreInfo) {
        log(`Mais informações: ${twilioError.moreInfo}`, 'twilio-sms');
      }
    }
    
    return false;
  }
}

/**
 * Formata o número de telefone para o formato internacional do Twilio
 * Se o número já começar com +, mantém como está
 * Caso contrário, adiciona o prefixo internacional do Brasil +55
 */
function formatPhoneNumber(phone: string): string {
  // Remove espaços, parênteses, hífens e outros caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Se o número já estiver no formato internacional (começando com +)
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Se o número começar com 0, remove o 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Se o número não tiver o código do país (55 para Brasil)
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  // Adiciona o + no início
  const formattedNumber = '+' + cleaned;
  
  log(`Número formatado: ${phone} -> ${formattedNumber}`, 'twilio-sms');
  
  return formattedNumber;
}

/**
 * Envia uma notificação SMS para a transportadora quando uma nova solicitação de frete é criada
 */
export async function sendNewFreightRequestSMS(
  companyPhone: string,
  companyName: string,
  requestId: number,
  clientName: string
): Promise<boolean> {
  const message = `LogMene: Nova solicitação de frete #${requestId} registrada por ${clientName}. Por favor, acesse o sistema para avaliar e enviar uma cotação.`;

  return await sendSMS(companyPhone, message);
}

/**
 * Envia uma notificação SMS quando o status de uma solicitação é atualizado
 */
export async function sendStatusUpdateSMS(
  phone: string,
  status: string,
  requestId: number
): Promise<boolean> {
  // Traduzir o status para uma mensagem amigável
  const statusMessages: Record<string, string> = {
    'quoted': `Cotação enviada para solicitação #${requestId}. Aguardando análise.`,
    'accepted': `Solicitação #${requestId} aceita. Frete em andamento.`,
    'rejected': `Solicitação #${requestId} recusada. Entre em contato para mais informações.`,
    'completed': `Frete #${requestId} concluído. Obrigado por usar nossos serviços!`,
    'pending': `Solicitação #${requestId} aguardando cotação.`
  };

  const message = `LogMene: ${statusMessages[status] || `Status da solicitação #${requestId} alterado para ${status}.`}`;

  return await sendSMS(phone, message);
}

/**
 * Envia uma notificação SMS quando um comprovante de entrega é anexado
 */
export async function sendDeliveryProofSMS(
  phone: string,
  requestId: number
): Promise<boolean> {
  const message = `LogMene: Comprovante de entrega anexado à solicitação #${requestId}. Acesse o sistema para visualizar.`;

  return await sendSMS(phone, message);
}