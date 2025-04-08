/**
 * Envia um email de notificação para a transportadora quando uma nova solicitação de frete é criada
 * @param companyEmail Email da transportadora
 * @param companyName Nome da transportadora
 * @param requestId ID da solicitação de frete
 * @param clientName Nome do cliente que criou a solicitação
 * @param freightDetails Detalhes adicionais sobre o frete (origem, destino, etc.)
 */
export async function sendNewFreightRequestEmail(
  companyEmail: string,
  companyName: string,
  requestId: number,
  clientName: string,
  freightDetails: string
): Promise<boolean> {
  const message = `
    <div style="margin-bottom: 15px;">
      <p>Uma nova solicitação de frete (#${requestId}) foi registrada por <strong>${clientName}</strong>.</p>
      <p>Detalhes da solicitação:</p>
      <p>${freightDetails}</p>
      <p>Por favor, acesse o sistema para avaliar e enviar uma cotação para esta solicitação o mais breve possível.</p>
    </div>
  `;

  const emailParams = createNotificationEmail(
    companyEmail,
    companyName,
    'new_request',
    requestId,
    message
  );

  return await sendEmail(emailParams);
} 