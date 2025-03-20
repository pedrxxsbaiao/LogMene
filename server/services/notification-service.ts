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
        if (!process.env.MAILERSEND_API_KEY) {
          throw new Error('MAILERSEND_API_KEY não configurada');
        }

        const emailParams = createNotificationEmail(
          type,
          user.fullName || user.username,
          requestId || 0,
          {
            status: type === 'status_update' ? message : undefined,
            value: type === 'quote_received' ? parseFloat(message.match(/R\$ ([\d,.]+)/)?.[1]?.replace('.', '').replace(',', '.') || '0') : undefined
          }
        );

        const result = await sendEmail({
          ...emailParams,
          to: user.email,
        });

        if (result) {
          log(`Email enviado via MailerSend para ${user.email}`, 'notification-service');
        } else {
          throw new Error('Falha no envio com MailerSend');
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
export async function sendNewFreightRequestNotification(companyUserId: number, requestId: number, clientName: string) {
  const message = `Nova solicitação de frete recebida do cliente ${clientName}. Acesse o sistema para enviar uma cotação.`;

  // WhatsApp desativado conforme solicitação do cliente
  // Apenas notificações por email estão ativas

  return sendNotification({
    userId: companyUserId,
    requestId,
    type: 'status_update',
    message
  });
}