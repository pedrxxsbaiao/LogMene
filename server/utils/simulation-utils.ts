import { log } from '../logger';

export interface SimulatedResponse {
  messageId: string;
  response: string;
}

/**
 * Cria um transportador de teste que apenas loga as mensagens
 * 
 * @param serviceName Nome do serviço para identificação nos logs
 * @returns Objeto com método sendMail para simulação
 */
export function createTestTransporter(serviceName: string) {
  log(`Criando transportador de teste para simular envio de mensagens`, serviceName);
  return {
    sendMail: (mailOptions: any) => {
      return new Promise<SimulatedResponse>((resolve) => {
        log(`[SIMULAÇÃO] Para: ${mailOptions.to}, Assunto: ${mailOptions.subject}`, serviceName);
        log(`[SIMULAÇÃO] Conteúdo: ${mailOptions.text || mailOptions.html?.substring(0, 150)}...`, serviceName);
        
        // Simular um delay para parecer mais realista
        setTimeout(() => {
          resolve({ 
            messageId: `simulated-${Date.now()}@logmene.local`,
            response: 'Envio simulado com sucesso'
          });
        }, 500);
      });
    }
  };
}

/**
 * Verifica se o serviço está em modo de simulação
 * 
 * @param serviceName Nome do serviço para identificação nos logs
 * @param requiredEnvVars Variáveis de ambiente necessárias para o serviço
 * @returns true se o serviço deve operar em modo de simulação
 */
export function shouldSimulate(serviceName: string, requiredEnvVars: string[]): boolean {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`AVISO: Variáveis de ambiente não configuradas para ${serviceName}: ${missingVars.join(', ')}`, serviceName);
    log(`Para usar o serviço, configure essas variáveis com credenciais válidas.`, serviceName);
    return true;
  }
  
  return false;
} 