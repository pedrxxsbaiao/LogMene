import { google } from 'googleapis';
import nodemailer from 'nodemailer';

export interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Configura e retorna um transportador de email usando a API do Gmail
 * Utiliza credenciais OAuth2 para autenticação segura
 */
async function createGmailTransporter() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    // Obter um token de acesso válido
    const accessToken = await new Promise<string>((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          console.error('Erro ao obter token de acesso:', err);
          reject('Falha na autenticação do Gmail');
        }
        resolve(token || '');
      });
    });

    // Configurar transportador com OAuth2
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'logmene.notificacoes@gmail.com', // Altere para o email configurado no OAuth
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken
      }
    });

    return transporter;
  } catch (error) {
    console.error('Erro ao criar transportador de email:', error);
    throw new Error('Não foi possível configurar o serviço de email');
  }
}

/**
 * Envia um email usando a API do Gmail
 * @param params Parâmetros do email (destinatário, assunto, conteúdo)
 * @returns Promise<boolean> indicando se o envio foi bem-sucedido
 */
export async function sendGmailEmail(params: EmailParams): Promise<boolean> {
  try {
    const transporter = await createGmailTransporter();
    
    const mailOptions = {
      from: params.from || 'LogMene Notificações <logmene.notificacoes@gmail.com>',
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado com sucesso via Gmail:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email via Gmail:', error);
    return false;
  }
}

/**
 * Envia um email de notificação para a transportadora quando uma nova solicitação de frete é criada
 */
export async function sendNewFreightRequestEmail(
  companyEmail: string,
  companyName: string,
  requestId: number,
  clientName: string,
  freightDetails: string
): Promise<boolean> {
  const subject = `Nova Solicitação de Frete (ID: ${requestId})`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a90e2;">Nova Solicitação de Frete</h2>
      <p>Olá <strong>${companyName}</strong>,</p>
      <p>Uma nova solicitação de frete foi criada pelo cliente <strong>${clientName}</strong>.</p>
      <p><strong>Detalhes do Frete:</strong></p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
        ${freightDetails}
      </div>
      <p>ID da Solicitação: <strong>${requestId}</strong></p>
      <p>Por favor, acesse o sistema para fornecer uma cotação.</p>
      <div style="margin-top: 20px; text-align: center;">
        <a href="${process.env.APP_URL || 'https://seu-app.example.com'}/company/request-details/${requestId}" 
           style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Ver Detalhes da Solicitação
        </a>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        Este é um email automático. Por favor, não responda diretamente a esta mensagem.
      </p>
    </div>
  `;

  return await sendGmailEmail({
    to: companyEmail,
    subject,
    html
  });
}

/**
 * Cria o conteúdo do email de notificação com base no tipo
 */
export function createNotificationEmail(
  type: 'status_update' | 'quote_received' | 'proof_uploaded',
  userName: string,
  requestId: number,
  extraInfo?: { status?: string; value?: number }
): EmailParams {
  let subject = '';
  let html = '';

  switch (type) {
    case 'status_update':
      const status = extraInfo?.status || 'atualizado';
      const statusMap: Record<string, string> = {
        'pending': 'Pendente',
        'quoted': 'Cotado',
        'accepted': 'Aceito',
        'rejected': 'Rejeitado',
        'completed': 'Finalizado'
      };
      const translatedStatus = statusMap[status] || status;

      subject = `Status da Solicitação de Frete Atualizado (ID: ${requestId})`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a90e2;">Atualização de Status</h2>
          <p>Olá <strong>${userName}</strong>,</p>
          <p>O status da sua solicitação de frete (ID: <strong>${requestId}</strong>) foi atualizado para <strong>${translatedStatus}</strong>.</p>
          <div style="margin-top: 20px; text-align: center;">
            <a href="${process.env.APP_URL || 'https://seu-app.example.com'}/client/request-details/${requestId}" 
              style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Ver Detalhes
            </a>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Este é um email automático. Por favor, não responda diretamente a esta mensagem.
          </p>
        </div>
      `;
      break;

    case 'quote_received':
      const formattedValue = extraInfo?.value ? 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extraInfo.value) : 
        'Disponível no sistema';

      subject = `Nova Cotação de Frete Recebida (ID: ${requestId})`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a90e2;">Nova Cotação de Frete</h2>
          <p>Olá <strong>${userName}</strong>,</p>
          <p>Uma cotação para sua solicitação de frete (ID: <strong>${requestId}</strong>) foi enviada.</p>
          <p><strong>Valor Cotado:</strong> ${formattedValue}</p>
          <div style="margin-top: 20px; text-align: center;">
            <a href="${process.env.APP_URL || 'https://seu-app.example.com'}/client/request-details/${requestId}" 
              style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Ver Detalhes e Aprovar
            </a>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Este é um email automático. Por favor, não responda diretamente a esta mensagem.
          </p>
        </div>
      `;
      break;

    case 'proof_uploaded':
      subject = `Comprovante de Entrega Enviado (ID: ${requestId})`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a90e2;">Comprovante de Entrega</h2>
          <p>Olá <strong>${userName}</strong>,</p>
          <p>Um comprovante de entrega foi enviado para a solicitação de frete (ID: <strong>${requestId}</strong>).</p>
          <p>A entrega foi marcada como finalizada. Por favor, verifique o comprovante no sistema.</p>
          <div style="margin-top: 20px; text-align: center;">
            <a href="${process.env.APP_URL || 'https://seu-app.example.com'}/client/request-details/${requestId}" 
              style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Ver Comprovante
            </a>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Este é um email automático. Por favor, não responda diretamente a esta mensagem.
          </p>
        </div>
      `;
      break;
  }

  return {
    to: '', // Será preenchido no momento do envio
    subject,
    html
  };
}