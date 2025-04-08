import winston from 'winston';

// Configuração do logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, service }) => {
      return `[${timestamp}] ${level.toUpperCase()} [${service || 'app'}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

/**
 * Função para logar mensagens no sistema
 * 
 * @param message Mensagem a ser logada
 * @param service Nome do serviço que está logando (opcional)
 */
export function log(message: string, service?: string): void {
  logger.log({
    level: 'info',
    message,
    service
  });
}

/**
 * Função para logar erros no sistema
 * 
 * @param message Mensagem de erro
 * @param service Nome do serviço que está logando (opcional)
 * @param error Objeto de erro (opcional)
 */
export function logError(message: string, service?: string, error?: any): void {
  logger.error({
    message,
    service,
    error: error ? error.stack || error.message : undefined
  });
} 