# Deployment LogMene na Vercel

Este documento fornece instruções detalhadas para implantar o sistema LogMene na Vercel.

## Pré-requisitos

1. Uma conta na [Vercel](https://vercel.com)
2. Um banco de dados PostgreSQL (recomendamos [Neon](https://neon.tech) ou outro serviço serverless)
3. Acesso às variáveis de ambiente necessárias (API keys, credenciais de banco de dados, etc.)

## Configuração do Projeto

### 1. Preparar o ambiente de variáveis

Configure as seguintes variáveis de ambiente na Vercel:

**Obrigatórias:**
- `DATABASE_URL`: URL de conexão do seu banco de dados PostgreSQL
- `JWT_SECRET`: Uma string secreta longa e aleatória para assinar tokens JWT
- `NODE_ENV`: Defina como "production"

**Opcionais (de acordo com os recursos que deseja usar):**
- `TWILIO_ACCOUNT_SID`: Account SID do Twilio para envio de SMS
- `TWILIO_AUTH_TOKEN`: Auth Token do Twilio
- `TWILIO_PHONE_NUMBER`: Número de telefone do Twilio (com formato internacional)

### 2. Deploy para a Vercel

O deploy pode ser realizado de duas formas:

#### Opção 1: Deploy via Vercel CLI

1. Instale a Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Navegue até a pasta do projeto e execute:
   ```
   vercel
   ```

3. Siga as instruções para configurar o projeto.

#### Opção 2: Deploy via GitHub

1. Envie o projeto para um repositório GitHub.
2. Na plataforma Vercel, clique em "New Project".
3. Selecione o repositório do GitHub.
4. Configure as variáveis de ambiente.
5. Clique em "Deploy".

### 3. Configurações adicionais

#### Banco de dados

Execute a migração do banco de dados para criar as tabelas necessárias:

1. Se estiver usando o esquema Drizzle, execute:
   ```
   npx drizzle-kit push:pg
   ```

#### Domínio personalizado

Para usar um domínio personalizado:

1. Na plataforma Vercel, vá para as configurações do projeto.
2. Navegue até a seção "Domains".
3. Adicione seu domínio personalizado e siga as instruções para configurar os registros DNS.

## Estrutura de arquivos para deployment

O projeto foi adaptado para o deployment na Vercel da seguinte forma:

1. A pasta `/api` contém todos os endpoints serverless.
2. O arquivo `vercel.json` configura as rotas e o ambiente.
3. Os arquivos estáticos são servidos da pasta `/dist`.

## Verificação do Deployment

Após o deployment, verifique se tudo está funcionando corretamente:

1. Acesse a URL do deployment fornecida pela Vercel.
2. Teste a autenticação fazendo login.
3. Verifique se todas as funcionalidades estão operando normalmente.
4. Teste o envio de notificações por email e SMS.

## Solução de problemas

### Problemas comuns e soluções

1. **Erro de conexão com o banco de dados**:
   - Verifique se a variável `DATABASE_URL` está corretamente configurada.
   - Certifique-se de que o IP da Vercel está liberado no firewall do banco de dados.

2. **Erros de email**:
   - Verifique se o domínio de email está verificado na plataforma MailerSend.

3. **Erros de SMS**:
   - Verifique as credenciais do Twilio.
   - Confirme se o número de telefone do Twilio está ativo e configurado corretamente.

### Logs

Para visualizar os logs:

1. Na plataforma Vercel, vá para o projeto.
2. Navegue até a aba "Functions".
3. Clique em uma função para ver seus logs.

## Manutenção contínua

1. **Atualizações**: Quando houver atualizações no código, faça um novo deploy seguindo o mesmo processo.
2. **Monitoramento**: Use ferramentas como New Relic ou o próprio painel da Vercel para monitorar o desempenho da aplicação.
3. **Backup**: Configure backups regulares do banco de dados.

## Recursos adicionais

- [Documentação da Vercel](https://vercel.com/docs)
- [Documentação do Neon PostgreSQL](https://neon.tech/docs)
- [Documentação do MailerSend](https://developers.mailersend.com)
- [Documentação do Twilio](https://www.twilio.com/docs)

Para mais informações ou suporte, entre em contato com a equipe de desenvolvimento do LogMene.