/**
 * Envia um email de notificação para a transportadora quando uma nova solicitação de frete é criada
 */
export async function sendNewFreightRequestEmail(
  companyEmail,
  companyName,
  requestId,
  clientName,
  freightDetails = {}
) {
  const subject = `Nova solicitação de frete #${requestId} de ${clientName}`;
  
  // Extrair detalhes do frete (se disponíveis)
  const { originAddress, destinationAddress, description, weight } = freightDetails;
  
  // Criar corpo do email
  const html = `
    <h2>Nova solicitação de frete</h2>
    <p>Olá ${companyName},</p>
    <p>Uma nova solicitação de frete (#${requestId}) foi registrada por <strong>${clientName}</strong>.</p>
    
    ${originAddress ? `<p><strong>Origem:</strong> ${originAddress}</p>` : ''}
    ${destinationAddress ? `<p><strong>Destino:</strong> ${destinationAddress}</p>` : ''}
    ${description ? `<p><strong>Descrição:</strong> ${description}</p>` : ''}
    ${weight ? `<p><strong>Peso:</strong> ${weight} kg</p>` : ''}
    
    <p>Por favor, acesse o sistema LogMene para avaliar esta solicitação e enviar uma cotação.</p>
    <p>Atenciosamente,<br>Equipe LogMene</p>
  `;
  
  const text = `
    Nova solicitação de frete
    
    Olá ${companyName},
    
    Uma nova solicitação de frete (#${requestId}) foi registrada por ${clientName}.
    
    ${originAddress ? `Origem: ${originAddress}` : ''}
    ${destinationAddress ? `Destino: ${destinationAddress}` : ''}
    ${description ? `Descrição: ${description}` : ''}
    ${weight ? `Peso: ${weight} kg` : ''}
    
    Por favor, acesse o sistema LogMene para avaliar esta solicitação e enviar uma cotação.
    
    Atenciosamente,
    Equipe LogMene
  `;
  
  // Enviar email
  return await sendEmailViaSMTP({
    to: companyEmail,
    subject,
    text,
    html,
    from: 'notificacoes@logmene.com.br'
  });
} 