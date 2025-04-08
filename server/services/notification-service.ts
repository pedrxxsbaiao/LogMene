import { storage } from '../storage';
import { log } from '../vite';
import { InsertNotification } from '@shared/schema';

/**
 * Serviço para enviar notificações internas para usuários
 */
export async function sendNotification({
  userId,
  requestId,
  type,
  message,
}: {
  userId: number;
  requestId: number | null;
  type: InsertNotification['type'];
  message: string;
}) {
  try {
    // Buscar usuário
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
    return true;
  } catch (error) {
    log(`Erro ao enviar notificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'notification-service');
    return false;
  }
}

/**
 * Enviar notificação de atualização de status de frete
 */
export async function sendStatusUpdateNotification(userId: number, requestId: number, status: string) {
  return sendNotification({
    userId,
    requestId,
    type: 'status_update',
    message: `Status do pedido atualizado para: ${status}`,
  });
}

/**
 * Enviar notificação de recebimento de cotação
 */
export async function sendQuoteNotification(userId: number, requestId: number, value: number) {
  return sendNotification({
    userId,
    requestId,
    type: 'quote_received',
    message: `Nova cotação recebida no valor de R$ ${value.toFixed(2)}`,
  });
}

/**
 * Enviar notificação de upload de comprovante de entrega
 */
export async function sendDeliveryProofNotification(userId: number, requestId: number) {
  return sendNotification({
    userId,
    requestId,
    type: 'proof_uploaded',
    message: 'Comprovante de entrega enviado com sucesso',
  });
}

/**
 * Enviar notificação para empresa quando uma nova solicitação de frete é criada
 */
export async function sendNewFreightRequestNotification(userId: number, requestId: number, clientName: string, freightDetails: string) {
  return sendNotification({
    userId,
    requestId,
    type: 'status_update', // Usando status_update como tipo genérico para novo pedido
    message: `Novo pedido de frete recebido de ${clientName}: ${freightDetails}`,
  });
}