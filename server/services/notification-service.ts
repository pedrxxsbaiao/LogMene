import { storage } from '../storage';
import { createNotificationEmail as createMailerSendEmail, sendEmail as sendMailerSendEmail } from './mailersend-service';
import { createNotificationEmail as createGmailEmail, sendGmailEmail } from './gmail-service';
import { log } from '../vite';
import { InsertNotification } from '@shared/schema';

/**
 * Serviço para enviar notificações para usuários
 * Permite envio de notificações in-app e email quando configurados
 */
export async function sendNotification({
  userId,
  requestId,
  type,
  message,
  sendEmail: shouldSendEmail = true,
}: {
  userId: number;
  requestId: number | null;
  type: InsertNotification['type'];
  message: string;
  sendEmail?: boolean;
}) {
  try {
    // Buscar usuário para obter email, telefone e nome
    const user = await storage.getUser(userId);
    if (!user) {
      log(`Usuário não encontrado para envio de notificação: ${userId}`, 'notification-service');
      return false;
    }

    // Criar notificação no sistema
    const notification = await storage.createNotification({
      userId,
      requestId,
      type,
      message,
      read: false,
    });

    log(`Notificação interna criada: [${type}] ${message} para usuário ${userId}`, 'notification-service');

    // Se solicitado, enviar também por email
    if (shouldSendEmail && user.email) {
      try {
        // Primeiro tenta enviar via Gmail API se configurado
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
          const emailParams = createGmailEmail(
            type,
            user.fullName || user.username,
            requestId || 0,
            {
              status: type === 'status_update' ? message : undefined,
              value: type === 'quote_received' ? parseFloat(message.match(/R\$ ([\d,.]+)/)?.[1]?.replace('.', '').replace(',', '.') || '0') : undefined
            }
          );

          const result = await sendGmailEmail({
            ...emailParams,
            to: user.email,
          });

          if (result) {
            log(`Email enviado via Gmail API para ${user.email}`, 'notification-service');
            return true; // Se o Gmail funcionou, não tenta o MailerSend
          } else {
            log('Falha no envio via Gmail API, tentando MailerSend como backup', 'notification-service');
          }
        }

        // Se Gmail não está configurado ou falhou, usa MailerSend como backup
        if (process.env.MAILERSEND_API_KEY) {
          const emailParams = createMailerSendEmail(
            type,
            user.fullName || user.username,
            requestId || 0,
            {
              status: type === 'status_update' ? message : undefined,
              value: type === 'quote_received' ? parseFloat(message.match(/R\$ ([\d,.]+)/)?.[1]?.replace('.', '').replace(',', '.') || '0') : undefined
            }
          );

          const result = await sendMailerSendEmail({
            ...emailParams,
            to: user.email,
          });

          if (result) {
            log(`Email enviado via MailerSend para ${user.email}`, 'notification-service');
          } else {
            throw new Error('Falha no envio com MailerSend');
          }
        } else {
          throw new Error('Nenhum serviço de email está configurado corretamente');
        }
      } catch (error) {
        log(`Erro ao enviar email de notificação: ${error}`, 'notification-service');
        // Continuamos a execução mesmo se o email falhar
      }
    }

    // Notificação por WhatsApp desativada conforme solicitação do cliente
    // Apenas notificações por email estão ativas

    return true;
  } catch (error) {
    log(`Erro ao enviar notificação: ${error}`, 'notification-service');
    return false;
  }
}

/**
 * Enviar notificação de atualização de status de frete
 */
export async function sendStatusUpdateNotification(userId: number, requestId: number, status: string) {
  const statusMessages: Record<string, string> = {
    'quoted': 'Uma nova cotação foi criada para sua solicitação de frete.',
    'accepted': 'Sua solicitação de frete foi aceita e está em andamento.',
    'rejected': 'Sua solicitação de frete foi recusada.',
    'completed': 'Seu frete foi entregue e concluído com sucesso.',
  };

  const message = statusMessages[status] || `O status da sua solicitação foi atualizado para "${status}".`;

  return sendNotification({
    userId,
    requestId,
    type: 'status_update',
    message,
  });
}

/**
 * Enviar notificação de recebimento de cotação
 */
export async function sendQuoteNotification(userId: number, requestId: number, value: number) {
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

  const message = `Uma cotação no valor de ${formattedValue} foi enviada para sua solicitação de frete. Acesse o sistema para revisar e responder.`;

  return sendNotification({
    userId,
    requestId,
    type: 'quote_received',
    message,
  });
}

/**
 * Enviar notificação de upload de comprovante de entrega
 */
export async function sendDeliveryProofNotification(userId: number, requestId: number) {
  const message = `Um comprovante de entrega foi adicionado à sua solicitação de frete. Acesse o sistema para visualizar.`;

  return sendNotification({
    userId,
    requestId,
    type: 'proof_uploaded',
    message,
  });
}

/**
 * Enviar notificação para empresa quando uma nova solicitação de frete é criada
 */
export async function sendNewFreightRequestNotification(companyUserId: number, requestId: number, clientName: string, freightDetails?: string) {
  const message = `Nova solicitação de frete recebida do cliente ${clientName}. Acesse o sistema para enviar uma cotação.`;

  // Enviar notificação interna
  const notificationResult = await sendNotification({
    userId: companyUserId,
    requestId,
    type: 'status_update',
    message
  });

  // Se temos os detalhes do frete e o Gmail configurado, tentar enviar um email mais detalhado
  if (freightDetails && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    try {
      // Buscar dados da empresa
      const company = await storage.getUser(companyUserId);
      if (company && company.email) {
        // Importar diretamente a função para evitar problemas de circular dependency
        const { sendNewFreightRequestEmail } = await import('./gmail-service');
        
        await sendNewFreightRequestEmail(
          company.email,
          company.fullName || company.username,
          requestId,
          clientName,
          freightDetails
        );
        
        log(`Email detalhado enviado para transportadora: ${company.email}`, 'notification-service');
      }
    } catch (error) {
      log(`Erro ao enviar email detalhado para transportadora: ${error}`, 'notification-service');
      // Continuamos mesmo que falhe o email detalhado
    }
  }

  return notificationResult;
}