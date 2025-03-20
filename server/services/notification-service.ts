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
        // Verificar se as credenciais do Gmail estão configuradas
        const hasGmailCredentials = process.env.GOOGLE_CLIENT_ID && 
                                   process.env.GOOGLE_CLIENT_SECRET && 
                                   process.env.GOOGLE_REFRESH_TOKEN;
        
        // Verificar se as credenciais do MailerSend estão configuradas
        const hasMailerSendCredentials = process.env.MAILERSEND_API_KEY;
        
        // Se não tiver nenhuma configuração, apenas log e continua
        if (!hasGmailCredentials && !hasMailerSendCredentials) {
          log('Nenhum serviço de email configurado. Ignorando o envio de email.', 'notification-service');
          return true; // Retorna true pois a notificação interna foi criada com sucesso
        }
        
        // Primeiro tenta enviar via Gmail API se configurado
        if (hasGmailCredentials) {
          try {
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
          } catch (gmailError) {
            log(`Erro com o Gmail API: ${gmailError}. Tentando MailerSend como backup.`, 'notification-service');
          }
        }

        // Se Gmail não está configurado ou falhou, usa MailerSend como backup
        if (hasMailerSendCredentials) {
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
            return true;
          } else {
            log('Falha no envio com MailerSend', 'notification-service');
            return true; // Continua mesmo com falha no email
          }
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

  // Verificar se temos os detalhes do frete
  if (freightDetails) {
    // Verificar se as credenciais do Gmail estão configuradas
    const hasGmailCredentials = process.env.GOOGLE_CLIENT_ID && 
                               process.env.GOOGLE_CLIENT_SECRET && 
                               process.env.GOOGLE_REFRESH_TOKEN;
    
    if (hasGmailCredentials) {
      try {
        // Buscar dados da empresa
        const company = await storage.getUser(companyUserId);
        if (company && company.email) {
          try {
            // Importar diretamente a função para evitar problemas de circular dependency
            const { sendNewFreightRequestEmail } = await import('./gmail-service');
            
            const emailResult = await sendNewFreightRequestEmail(
              company.email,
              company.fullName || company.username,
              requestId,
              clientName,
              freightDetails
            );
            
            if (emailResult) {
              log(`Email detalhado enviado para transportadora: ${company.email}`, 'notification-service');
            } else {
              log(`Falha ao enviar email detalhado para transportadora: ${company.email}`, 'notification-service');
            }
          } catch (emailError) {
            log(`Erro ao enviar email detalhado: ${emailError}`, 'notification-service');
          }
        }
      } catch (userError) {
        log(`Erro ao buscar dados do usuário para email: ${userError}`, 'notification-service');
      }
    } else {
      log('Credenciais do Gmail não configuradas. Ignorando envio de email detalhado.', 'notification-service');
    }
  }

  return notificationResult;
}