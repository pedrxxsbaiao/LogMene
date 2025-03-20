import { sendGmailEmail } from '../server/services/gmail-service';

/**
 * Endpoint de teste para a integração com a API do Gmail
 * Permite enviar um email de teste para verificar se a configuração OAuth2 está funcionando
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export default async function handler(req, res) {
  // Aceita apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, message } = req.body;

    // Validação simples
    if (!to || !subject || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['to', 'subject', 'message'],
        received: req.body 
      });
    }

    // Tenta enviar o email
    const result = await sendGmailEmail({
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a90e2;">Teste de Email - LogMene</h2>
          <p>Este é um email de teste enviado pelo sistema LogMene.</p>
          <p>Mensagem: <strong>${message}</strong></p>
          <p>Se você está vendo este email, a integração com o Gmail API está funcionando corretamente!</p>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Este é um email automático. Por favor, não responda diretamente a esta mensagem.
          </p>
        </div>
      `,
      text: `Teste de Email - LogMene\n\nEste é um email de teste enviado pelo sistema LogMene.\n\nMensagem: ${message}\n\nSe você está vendo este email, a integração com o Gmail API está funcionando corretamente!`
    });

    if (result) {
      return res.status(200).json({ success: true, message: 'Email enviado com sucesso' });
    } else {
      return res.status(500).json({ error: 'Falha ao enviar email' });
    }
  } catch (error) {
    console.error('Erro ao testar serviço de email Gmail:', error);
    return res.status(500).json({ error: 'Erro interno ao processar requisição', details: error.message });
  }
}