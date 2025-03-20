import { sendGmailEmail } from '../server/services/gmail-service';

/**
 * Endpoint de teste para a integração com a API do Gmail
 * Permite enviar um email de teste para verificar se a configuração OAuth2 está funcionando
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios: to, subject, message'
      });
    }

    console.log(`Iniciando teste de email para: ${to}`);
    
    // Preparando o conteúdo HTML do email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a90e2;">Teste de Integração com Gmail</h2>
        <p>Este é um email de teste para verificar a integração com a API do Gmail.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Mensagem de teste:</strong></p>
          <p>${message}</p>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Este é um email automático. Por favor, não responda diretamente a esta mensagem.
        </p>
        <p style="font-size: 12px; color: #999;">
          Enviado em: ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    `;

    // Usando o serviço de Gmail para enviar o email
    const result = await sendGmailEmail({
      to,
      subject,
      html: htmlContent,
      text: `Teste de Integração com Gmail: ${message}\n\nEnviado em: ${new Date().toLocaleString('pt-BR')}`
    });

    if (result) {
      console.log(`Email de teste enviado com sucesso para: ${to}`);
      return res.status(200).json({
        success: true,
        message: `Email enviado com sucesso para ${to}`
      });
    } else {
      console.error(`Falha ao enviar email de teste para: ${to}`);
      return res.status(500).json({
        success: false,
        message: "Falha ao enviar email de teste"
      });
    }
  } catch (error) {
    console.error("Erro ao enviar email de teste:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao processar requisição de teste de email",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}